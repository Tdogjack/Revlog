import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { db } from "@/db";
import {
  emailSettings,
  mileageReadings,
  mods,
  pushTokens,
  reminders,
  serviceRecords,
  vehicles,
} from "@/db/schema";
import { emailConfigured, sendEmail } from "@/lib/email";
import { unsubscribeToken } from "@/lib/email-settings";
import { reminderEmail, type ReminderEmailCar } from "@/lib/email-templates";
import {
  buildMileageTimeline,
  daysUntilMiles,
  milesPerDay,
  type TimelinePoint,
} from "@/lib/mileage-timeline";
import {
  describeDue,
  dueLimits,
  evaluateReminder,
  STATUS_RANK,
  withCarAgeStart,
  withLastService,
} from "@/lib/reminders";
import { pushTokensFor, sendPush, type PushMessage } from "@/lib/push";
import { siteUrl } from "@/lib/site";
import { vehicleName } from "@/lib/vehicles";

// A reminder that's still due is emailed again at most once a week.
const RENOTIFY_DAYS = 7;
// Resend's free plan allows 100 emails a day and 2 a second.
const MAX_EMAILS_PER_RUN = 90;
const SEND_GAP_MS = 600;
// A reminder the odometer says is fine, but the usual pace says is likely due
// within this many days, gets a "check your odometer" nudge.
const LIKELY_DUE_DAYS = 14;

type Candidate = {
  userId: string;
  // Null when the owner gets push only (no confirmed email, or emails off).
  email: string | null;
  wantsPush: boolean;
  reminderId: string;
  task: string;
  serviceCategory: string | null;
  reminderPercent: number | null;
  intervalMiles: number | null;
  intervalMonths: number | null;
  lastDoneOn: string | null;
  lastDoneMileage: number | null;
  startedOn: string | null;
  createdAt: Date;
  vehicleId: string;
  vehicle: {
    year: number;
    make: string;
    model: string;
    trim: string | null;
    nickname: string | null;
  };
  vin: string | null;
  builtOn: string | null;
  currentMileage: number;
};

// Reminders whose owners can be reached (a confirmed email with reminder
// emails on, or a phone with push reminders on) and haven't been notified
// about this reminder recently.
async function candidateReminders(): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - RENOTIFY_DAYS * 24 * 60 * 60 * 1000);
  const wantsEmail = sql<boolean>`(${authUsers.email} is not null and ${authUsers.emailConfirmedAt} is not null and coalesce(${emailSettings.reminderEmails}, true))`;
  const wantsPush = sql<boolean>`(coalesce(${emailSettings.pushReminders}, true) and exists (select 1 from ${pushTokens} where ${pushTokens.userId} = ${reminders.userId}))`;
  const rows = await db
    .select({
      userId: reminders.userId,
      email: authUsers.email,
      wantsEmail,
      wantsPush,
      reminderId: reminders.id,
      task: reminders.task,
      serviceCategory: reminders.serviceCategory,
      intervalMiles: reminders.intervalMiles,
      intervalMonths: reminders.intervalMonths,
      lastDoneOn: reminders.lastDoneOn,
      lastDoneMileage: reminders.lastDoneMileage,
      startedOn: reminders.startedOn,
      createdAt: reminders.createdAt,
      reminderPercent: emailSettings.reminderPercent,
      vehicleId: reminders.vehicleId,
      year: vehicles.year,
      make: vehicles.make,
      model: vehicles.model,
      trim: vehicles.trim,
      nickname: vehicles.nickname,
      vin: vehicles.vin,
      builtOn: vehicles.builtOn,
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
        or(wantsEmail, wantsPush),
        or(isNull(reminders.lastNotifiedAt), lt(reminders.lastNotifiedAt, cutoff)),
      ),
    );

  return rows.map(({ wantsEmail: emailOk, ...r }) => ({
    ...r,
    email: emailOk ? r.email : null,
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

// Each car's logged mileage line (readings, service, and mods with a
// mileage), for estimating how far it's been driven since.
async function mileageLines(vehicleIds: string[], currentMileage: Map<string, number>, today: Date) {
  const [readings, services, carMods] = await Promise.all([
    db
      .select({ vehicleId: mileageReadings.vehicleId, date: mileageReadings.readOn, mileage: mileageReadings.mileage })
      .from(mileageReadings)
      .where(inArray(mileageReadings.vehicleId, vehicleIds)),
    db
      .select({ vehicleId: serviceRecords.vehicleId, date: serviceRecords.servicedOn, mileage: serviceRecords.mileage })
      .from(serviceRecords)
      .where(and(inArray(serviceRecords.vehicleId, vehicleIds), isNotNull(serviceRecords.mileage))),
    db
      .select({ vehicleId: mods.vehicleId, date: mods.installedOn, mileage: mods.installedMileage })
      .from(mods)
      .where(
        and(inArray(mods.vehicleId, vehicleIds), isNotNull(mods.installedOn), isNotNull(mods.installedMileage)),
      ),
  ]);
  const todayIso = today.toISOString().slice(0, 10);
  const lines = new Map<string, TimelinePoint[]>();
  for (const id of vehicleIds) {
    const events = [...readings, ...services, ...carMods]
      .filter((e) => e.vehicleId === id)
      .map((e, i) => ({ key: String(i), kind: "reading" as const, date: e.date!, mileage: e.mileage, label: "" }));
    const timeline = buildMileageTimeline(events, currentMileage.get(id) ?? 0, todayIso);
    if (timeline) lines.set(id, timeline.line);
  }
  return lines;
}

const mi = (n: number) => Math.round(n).toLocaleString("en-US");

type Outbox = {
  email: string | null;
  wantsPush: boolean;
  cars: Map<string, ReminderEmailCar & { vehicleId: string }>;
  reminderIds: string[];
};

// Builds one email per user listing every due-soon or overdue reminder.
async function buildOutbox(today: Date) {
  const candidates = await candidateReminders();
  if (candidates.length === 0) return [];
  const services = await serviceDatesFor([...new Set(candidates.map((c) => c.userId))]);

  const byUser = new Map<string, Outbox>();
  const ranked = candidates
    .map((c) => {
      const reminder = withCarAgeStart(withLastService(c, services), {
        year: c.vehicle.year,
        vin: c.vin,
        builtOn: c.builtOn,
      });
      return {
        c,
        reminder,
        result: evaluateReminder(reminder, c.currentMileage, today, {
          dueSoonPercent: c.reminderPercent,
        }),
      };
    });

  // Reminders that look fine by the last odometer reading but, at the car's
  // usual pace, have likely come due or will within two weeks.
  const lines = await mileageLines(
    [...new Set(candidates.map((c) => c.vehicleId))],
    new Map(candidates.map((c) => [c.vehicleId, c.currentMileage])),
    today,
  );
  const likely = new Map<string, string>();
  for (const { c, reminder, result } of ranked) {
    const { dueMiles } = dueLimits(reminder);
    const line = lines.get(c.vehicleId);
    const rate = line && milesPerDay(line);
    if (result.status !== "ok" || dueMiles == null || !line || !rate) continue;
    const days = Math.ceil(daysUntilMiles(line, rate, dueMiles, today.getTime()));
    if (days > LIKELY_DUE_DAYS) continue;
    const pace = `you drive about ${mi(rate * 30.44)} mi a month`;
    likely.set(
      c.reminderId,
      days <= 0
        ? `Likely due now: it's due at ${mi(dueMiles)} mi and ${pace}. Check your odometer.`
        : `Likely due in about ${days} ${days === 1 ? "day" : "days"}: it's due at ${mi(dueMiles)} mi and ${pace}. Check your odometer.`,
    );
  }

  const due = ranked
    .filter(
      ({ c, result }) =>
        result.status === "overdue" || result.status === "due_soon" || likely.has(c.reminderId),
    )
    .sort((a, b) => STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status]);

  for (const { c, result } of due) {
    let box = byUser.get(c.userId);
    if (!box) {
      box = { email: c.email, wantsPush: c.wantsPush, cars: new Map(), reminderIds: [] };
      byUser.set(c.userId, box);
    }
    let car = box.cars.get(c.vehicleId);
    if (!car) {
      car = { vehicleId: c.vehicleId, name: c.vehicle.nickname || vehicleName(c.vehicle), items: [] };
      box.cars.set(c.vehicleId, car);
    }
    const guess = likely.get(c.reminderId);
    car.items.push(
      guess
        ? { task: c.task, status: "due_soon", due: guess, likely: true }
        : { task: c.task, status: result.status, due: describeDue(result) },
    );
    box.reminderIds.push(c.reminderId);
  }
  return [...byUser.entries()];
}

// Counts what would be sent without sending or marking anything.
export async function previewReminderEmails(today = new Date()) {
  const outbox = await buildOutbox(today);
  return {
    users: outbox.length,
    emails: outbox.filter(([, box]) => box.email).length,
    pushUsers: outbox.filter(([, box]) => box.wantsPush).length,
    reminders: outbox.reduce((n, [, box]) => n + box.reminderIds.length, 0),
  };
}

// One notification per phone, naming the most urgent item and how many more.
function pushMessagesFor(box: Outbox, tokens: string[]): PushMessage[] {
  const cars = [...box.cars.values()];
  const items = cars.flatMap((car) => car.items.map((item) => ({ car, item })));
  const [{ car, item }] = items;
  const overdue = items.some((entry) => entry.item.status === "overdue");
  const more = items.length - 1;
  const body =
    `${item.task} on your ${car.name}: ${item.due}` +
    (more > 0 ? ` Plus ${more} more ${more === 1 ? "item" : "items"}.` : "");
  // One car opens that car; several open the garage.
  const url = cars.length === 1 ? `/car/${car.vehicleId}` : "/";
  return tokens.map((to) => ({
    to,
    title: overdue ? "Service overdue" : "Service due soon",
    body,
    data: { url },
  }));
}

async function sendEmailTo(userId: string, box: Outbox & { email: string }, base: string) {
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
  return result.ok;
}

export async function sendReminderEmails(today = new Date()) {
  const outbox = await buildOutbox(today);
  const base = siteUrl();
  const canEmail = emailConfigured();
  const reached = new Set<string>();
  let sent = 0;
  let failed = 0;

  // Push first: it has no daily cap, so every phone hears even on a busy day.
  const tokens = await pushTokensFor(outbox.filter(([, box]) => box.wantsPush).map(([id]) => id));
  const messages = outbox.flatMap(([userId, box]) =>
    box.wantsPush ? pushMessagesFor(box, tokens.get(userId) ?? []) : [],
  );
  const accepted = await sendPush(messages);
  for (const [userId] of outbox) {
    if ((tokens.get(userId) ?? []).some((t) => accepted.has(t))) reached.add(userId);
  }

  const emailBoxes = canEmail
    ? outbox
        .filter((entry): entry is [string, Outbox & { email: string }] => entry[1].email != null)
        .slice(0, MAX_EMAILS_PER_RUN)
    : [];
  for (const [index, [userId, box]] of emailBoxes.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
    if (await sendEmailTo(userId, box, base)) {
      sent++;
      reached.add(userId);
    } else {
      failed++;
    }
  }

  for (const [userId, box] of outbox) {
    if (!reached.has(userId)) continue;
    await db
      .update(reminders)
      .set({ lastNotifiedAt: new Date() })
      .where(and(eq(reminders.userId, userId), inArray(reminders.id, box.reminderIds)));
  }

  return {
    users: outbox.length,
    sent,
    failed,
    pushed: accepted.size,
    emailSkipped: canEmail ? undefined : "Set RESEND_API_KEY and EMAIL_FROM to send email.",
  };
}
