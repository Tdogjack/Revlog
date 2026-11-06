import "server-only";
import { z } from "zod";
import { parsePartRows, settlePartsCost, syncParts } from "@/lib/parts";
import { getReminder, listReminders, setReminderStart } from "@/lib/reminder-store";
import { categoryLabel, mileageTypes } from "@/lib/service-categories";
import {
  createServiceRecord,
  serviceRecordInput,
  updateServiceRecord,
  type ServiceRecordInput,
} from "@/lib/service-records";
import { listServiceTypes, resolveServiceType } from "@/lib/service-types";
import { getVehicle } from "@/lib/vehicles";

const FIELDS = ["category", "newType", "title", "servicedOn", "mileage", "cost", "shop", "notes"];

// Form values. `parts` is left out when the caller isn't changing them.
export type ServiceFields = Record<string, string> & { parts?: string };

// `read` gets one value from a form or JSON body. A missing parts list stays
// missing, because syncing an empty list would delete the saved parts.
export function readServiceFields(read: (key: string) => unknown): ServiceFields {
  const fields: ServiceFields = Object.fromEntries(FIELDS.map((k) => [k, String(read(k) ?? "")]));
  const parts = read("parts");
  if (parts != null) fields.parts = String(parts);
  return fields;
}

// Shared by add and edit: resolves the type (maybe creating a custom one) and validates.
async function parseFields(userId: string, raw: ServiceFields) {
  const type = await resolveServiceType(userId, raw.category, raw.newType);
  if ("error" in type) return { error: type.error };

  const parsed = serviceRecordInput.safeParse({ ...raw, category: type.key });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const partRows = raw.parts === undefined ? null : parsePartRows(raw.parts);
  if (partRows && "error" in partRows) return { error: partRows.error };

  const title = parsed.data.title || categoryLabel(type.key, await listServiceTypes(userId));
  return { data: { ...parsed.data, title }, parts: partRows?.rows ?? null };
}

async function savePartsAndCost(
  userId: string,
  vehicleId: string,
  recordId: string,
  parts: Parameters<typeof syncParts>[3] | null,
  costGiven: boolean,
) {
  const parent = { serviceRecordId: recordId };
  const toCheck = parts ? await syncParts(userId, vehicleId, parent, parts) : [];
  await settlePartsCost(userId, parent, toCheck, costGiven);
}

const extraServicesSchema = z
  .array(z.object({ category: z.string(), title: z.string(), cost: z.string() }))
  .max(10);

// Other services from a scanned receipt. Each becomes its own record with
// the main record's date, mileage, and shop.
async function parseExtraServices(userId: string, raw: unknown, main: ServiceRecordInput) {
  if (typeof raw !== "string" || !raw) return { rows: [] };
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  const list = extraServicesSchema.safeParse(json);
  if (!list.success) return { error: "The other services couldn't be read. Scan the receipt again." };

  const customTypes = await listServiceTypes(userId);
  const rows: ServiceRecordInput[] = [];
  for (const extra of list.data) {
    const type = await resolveServiceType(userId, extra.category, "");
    if ("error" in type) return { error: type.error };
    const parsed = serviceRecordInput.safeParse({
      category: type.key,
      title: extra.title,
      servicedOn: main.servicedOn,
      mileage: "",
      cost: extra.cost,
      shop: main.shop ?? "",
      notes: "",
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    rows.push({
      ...parsed.data,
      title: parsed.data.title || categoryLabel(type.key, customTypes),
      mileage: main.mileage,
    });
  }
  return { rows };
}

// Logs a service. With `reminderId`, this is "mark done" on that reminder.
export async function logService(
  userId: string,
  vehicleId: string,
  reminderId: string | null,
  raw: ServiceFields,
  extraServices: unknown = null,
): Promise<{ error: string } | { id: string }> {
  const result = await parseFields(userId, raw);
  if (result.error !== undefined) return { error: result.error };

  // Mileage-based services always get a mileage; blank means the car's current one.
  const car = await getVehicle(userId, vehicleId);
  if (!car) return { error: "That car wasn't found." };
  const types = mileageTypes(await listReminders(userId, vehicleId));
  const withMileage = <T extends { category: string; mileage: number | null }>(r: T): T =>
    r.mileage == null && types.includes(r.category) ? { ...r, mileage: car.currentMileage } : r;
  const data = withMileage(result.data);

  const extras = await parseExtraServices(userId, extraServices, data);
  if (extras.error !== undefined) return { error: extras.error };

  const record = await createServiceRecord(userId, vehicleId, data);
  if (!record) return { error: "That car wasn't found." };
  await savePartsAndCost(userId, vehicleId, record.id, result.parts, result.data.cost != null);
  for (const extra of extras.rows) await createServiceRecord(userId, vehicleId, withMileage(extra));

  // Reminders tied to a service type reset from the new record on their own;
  // ones without a type restart their schedule here.
  if (reminderId) {
    const reminder = await getReminder(userId, vehicleId, reminderId);
    if (reminder && !reminder.serviceCategory) {
      await setReminderStart(userId, reminderId, data.servicedOn, data.mileage ?? car.currentMileage);
    }
  }
  return { id: record.id };
}

// Returns an error message, or null once saved.
export async function editService(
  userId: string,
  vehicleId: string,
  recordId: string,
  raw: ServiceFields,
) {
  const result = await parseFields(userId, raw);
  if ("error" in result) return result.error;

  const record = await updateServiceRecord(userId, vehicleId, recordId, result.data);
  if (!record) return "That record wasn't found.";
  await savePartsAndCost(userId, vehicleId, record.id, result.parts, result.data.cost != null);
  return null;
}
