"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { photoPathsFor, removePhotoFiles } from "@/lib/gallery";
import { parsePartRows, settlePartsCost, syncParts } from "@/lib/parts";
import { getReminder, listReminders, setReminderStart } from "@/lib/reminder-store";
import { categoryLabel, mileageTypes } from "@/lib/service-categories";
import {
  createServiceRecord,
  deleteServiceRecord,
  serviceRecordInput,
  updateServiceRecord,
  type ServiceRecordInput,
} from "@/lib/service-records";
import { scanReceipt, type ScanResult } from "@/lib/receipt-scan";
import { listServiceTypes, resolveServiceType } from "@/lib/service-types";
import { getVehicle } from "@/lib/vehicles";

export type ServiceFormState =
  { error?: string; values?: Record<string, string>; savedId?: string } | undefined;

const FIELDS = [
  "category",
  "newType",
  "title",
  "servicedOn",
  "mileage",
  "cost",
  "shop",
  "notes",
  "parts",
];

// Shared by add and edit: resolves the type (maybe creating a custom one) and validates.
async function parseServiceForm(userId: string, formData: FormData) {
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const type = await resolveServiceType(userId, raw.category, raw.newType);
  if ("error" in type) return { error: type.error, raw } as const;

  const parsed = serviceRecordInput.safeParse({ ...raw, category: type.key });
  if (!parsed.success) return { error: parsed.error.issues[0].message, raw } as const;

  const partRows = parsePartRows(raw.parts);
  if ("error" in partRows) return { error: partRows.error, raw } as const;

  const title = parsed.data.title || categoryLabel(type.key, await listServiceTypes(userId));
  return { data: { ...parsed.data, title }, parts: partRows.rows, raw } as const;
}

const extraServicesSchema = z
  .array(z.object({ category: z.string(), title: z.string(), cost: z.string() }))
  .max(10);

// Other services from a scanned receipt. Each becomes its own record with
// the main record's date, mileage, and shop.
async function parseExtraServices(
  userId: string,
  raw: FormDataEntryValue | null,
  main: ServiceRecordInput,
) {
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

export async function addServiceRecord(
  vehicleId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  return logService(vehicleId, null, formData);
}

// "Mark done" on a reminder logs the service through the same form.
export async function addReminderService(
  vehicleId: string,
  reminderId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  return logService(vehicleId, reminderId, formData);
}

async function logService(
  vehicleId: string,
  reminderId: string | null,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireUser();
  const result = await parseServiceForm(user.id, formData);
  if ("error" in result) return { error: result.error, values: result.raw };

  // Mileage-based services always get a mileage; blank means the car's current one.
  const car = await getVehicle(user.id, vehicleId);
  if (!car) return { error: "That car wasn't found.", values: result.raw };
  const types = mileageTypes(await listReminders(user.id, vehicleId));
  const withMileage = <T extends { category: string; mileage: number | null }>(r: T): T =>
    r.mileage == null && types.includes(r.category) ? { ...r, mileage: car.currentMileage } : r;
  const data = withMileage(result.data);

  const extras = await parseExtraServices(user.id, formData.get("extraServices"), data);
  if ("error" in extras) return { error: extras.error, values: result.raw };

  const record = await createServiceRecord(user.id, vehicleId, data);
  if (!record) return { error: "That car wasn't found.", values: result.raw };
  const parent = { serviceRecordId: record.id };
  const toCheck = await syncParts(user.id, vehicleId, parent, result.parts);
  await settlePartsCost(user.id, parent, toCheck, result.data.cost != null);
  for (const extra of extras.rows) await createServiceRecord(user.id, vehicleId, withMileage(extra));

  // Reminders tied to a service type reset from the new record on their own;
  // ones without a type restart their schedule here.
  if (reminderId) {
    const reminder = await getReminder(user.id, vehicleId, reminderId);
    if (reminder && !reminder.serviceCategory) {
      await setReminderStart(
        user.id,
        reminderId,
        data.servicedOn,
        data.mileage ?? car.currentMileage,
      );
    }
  }

  // With photos waiting, the form uploads them to the new record, then leaves.
  if (formData.get("stay")) return { savedId: record.id };
  redirect(`/garage/${vehicleId}`);
}

export async function editServiceRecord(
  vehicleId: string,
  recordId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireUser();
  const result = await parseServiceForm(user.id, formData);
  if ("error" in result) return { error: result.error, values: result.raw };

  const record = await updateServiceRecord(user.id, vehicleId, recordId, result.data);
  if (!record) return { error: "That record wasn't found.", values: result.raw };
  const parent = { serviceRecordId: record.id };
  const toCheck = await syncParts(user.id, vehicleId, parent, result.parts);
  await settlePartsCost(user.id, parent, toCheck, result.data.cost != null);

  redirect(`/garage/${vehicleId}`);
}

// Reads a receipt photo into form values. Nothing is saved here.
export async function scanServiceReceipt(formData: FormData): Promise<ScanResult> {
  const user = await requireUser();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a receipt photo." };
  return scanReceipt(user.id, photo, await listServiceTypes(user.id));
}

export async function removeServiceRecord(vehicleId: string, recordId: string) {
  const user = await requireUser();
  const paths = await photoPathsFor(user.id, { kind: "record", id: recordId });
  await deleteServiceRecord(user.id, recordId);
  await removePhotoFiles(paths);
  revalidatePath(`/garage/${vehicleId}`);
}
