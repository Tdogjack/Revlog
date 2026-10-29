import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { db } from "@/db";
import { emailSettings, reminders, serviceRecords, vehicles } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { unsubscribeToken } from "@/lib/email-settings";
import { reminderEmail, type ReminderEmailCar } from "@/lib/email-templates";
import { describeDue, evaluateReminder, STATUS_RANK, withLastService } from "@/lib/reminders";
import { siteUrl } from "@/lib/site";
import { vehicleName } from "@/lib/vehicles";

// A reminder that's still due is emailed again at most once a week.
const RENOTIFY_DAYS = 7;
// Resend's free plan allows 100 emails a day and 2 a second.
const MAX_EMAILS_PER_RUN = 90;
const SEND_GAP_MS = 600;

type Candidate = {
  userId: string;
  email: string;
  reminderId: string;
  task: string;
  serviceCategory: string | null;
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDoneOn: string | null;
  lastDoneMileage: number | null;
  vehicleId: string;
  vehicle: {
    year: number;
    make: string;
    model: string;
    trim: string | null;
    nickname: string | null;
  };
  currentMileage: number;
};

// Reminders whose owners have a confirmed email, haven't turned reminder
// emails off, and haven't been emailed about this reminder recently.
async function candidateReminders(): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - RENOTIFY_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      userId: reminders.userId,
      email: authUsers.email,
      reminderId: reminders.id,
      task: reminders.task,
      serviceCategory: reminders.serviceCategory,
      intervalMiles: reminders.intervalMiles,
      intervalMonths: reminders.intervalMonths,
      lastDoneOn: reminders.lastDoneOn,
      lastDoneMileage: reminders.lastDoneMileage,
      vehicleId: reminders.vehicleId,
      year: vehicles.year,
      make: vehicles.make,
      model: vehicles.model,
      trim: vehicles.trim,
      nickname: vehicles.nickname,
      currentMileage: vehicles.currentMileage,
    })
    .from(reminders)
    .innerJoin(
      vehicles,
      and(eq(vehicles.id, reminders.vehicleId), eq(vehicles.userId, reminders.userId)),
    )
    .innerJoin(authUsers, eq(authUsers.id, reminders.userId))
    .leftJoin(emailSettings, eq(emailSettings.userId, reminders.userId))
    .where(
      and(
        isNotNull(authUsers.email),
        isNotNull(authUsers.emailConfirmedAt),
        sql`coalesce(${emailSettings.reminderEmails}, true)`,
        or(isNull(reminders.lastNotifiedAt), lt(reminders.lastNotifiedAt, cutoff)),
      ),
    );

  return rows.map((r) => ({
    ...r,
    email: r.email!,
    vehicle: { year: r.year, make: r.make, model: r.model, trim: r.trim, nickname: r.nickname },
  }));
}

function serviceDatesFor(userIds: string[]) {
  return db
    .select({
      vehicleId: serviceRecords.vehicleId,
      category: serviceRecords.category,
      servicedOn: serviceRecords.servicedOn,
      mileage: serviceRecords.mileage,
    })
    .from(serviceRecords)
    .where(inArray(serviceRecords.userId, userIds));
}

type Outbox = { email: string; cars: Map<string, ReminderEmailCar>; reminderIds: string[] };

// Builds one email per user listing every due-soon or overdue reminder.
async function buildOutbox(today: Date) {
  const candidates = await candidateReminders();
  if (candidates.length === 0) return [];
  const services = await serviceDatesFor([...new Set(candidates.map((c) => c.userId))]);

  const byUser = new Map<string, Outbox>();
  const ranked = candidates
    .map((c) => {
      const reminder = withLastService(c, services);
      return { c, result: evaluateReminder(reminder, c.currentMileage, today) };
    })
    .filter(({ result }) => result.status !== "ok")
    .sort((a, b) => STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status]);

  for (const { c, result } of ranked) {
    let box = byUser.get(c.userId);
    if (!box) {
      box = { email: c.email, cars: new Map(), reminderIds: [] };
      byUser.set(c.userId, box);
    }
    let car = box.cars.get(c.vehicleId);
    if (!car) {
      car = { name: c.vehicle.nickname || vehicleName(c.vehicle), items: [] };
      box.cars.set(c.vehicleId, car);
    }
    car.items.push({ task: c.task, status: result.status, due: describeDue(result) });
    box.reminderIds.push(c.reminderId);
  }
  return [...byUser.entries()];
}

// Counts what would be sent without sending or marking anything.
export async function previewReminderEmails(today = new Date()) {
  const outbox = await buildOutbox(today);
  return {
    users: outbox.length,
    reminders: outbox.reduce((n, [, box]) => n + box.reminderIds.length, 0),
  };
}

export async function sendReminderEmails(today = new Date()) {
  const outbox = (await buildOutbox(today)).slice(0, MAX_EMAILS_PER_RUN);
  const base = siteUrl();
  let sent = 0;
  let failed = 0;

  for (const [index, [userId, box]] of outbox.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
    const unsubscribeUrl = `${base}/unsubscribe?t=${unsubscribeToken(userId)}`;
    const message = reminderEmail({
      cars: [...box.cars.values()],
      garageUrl: `${base}/garage`,
      settingsUrl: `${base}/garage/settings`,
      unsubscribeUrl,
    });
    const result = await sendEmail({
      to: box.email,
      ...message,
      headers: {
        "List-Unsubscribe": `<${base}/api/unsubscribe?t=${unsubscribeToken(userId)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (!result.ok) {
      failed++;
      continue;
    }
    sent++;
    await db
      .update(reminders)
      .set({ lastNotifiedAt: new Date() })
      .where(and(eq(reminders.userId, userId), inArray(reminders.id, box.reminderIds)));
  }

  return { users: outbox.length, sent, failed };
}
