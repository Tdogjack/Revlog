"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/service-categories";
import {
  createServiceRecord,
  deleteServiceRecord,
  serviceRecordInput,
  updateServiceRecord,
} from "@/lib/service-records";
import { listServiceTypes, resolveServiceType } from "@/lib/service-types";

export type ServiceFormState = { error?: string; values?: Record<string, string> } | undefined;

const FIELDS = ["category", "newType", "title", "servicedOn", "mileage", "cost", "shop", "notes"];

// Shared by add and edit: resolves the type (maybe creating a custom one) and validates.
async function parseServiceForm(userId: string, formData: FormData) {
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const type = await resolveServiceType(userId, raw.category, raw.newType);
  if ("error" in type) return { error: type.error, raw } as const;

  const parsed = serviceRecordInput.safeParse({ ...raw, category: type.key });
  if (!parsed.success) return { error: parsed.error.issues[0].message, raw } as const;

  const title = parsed.data.title || categoryLabel(type.key, await listServiceTypes(userId));
  return { data: { ...parsed.data, title }, raw } as const;
}

export async function addServiceRecord(
  vehicleId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireUser();
  const result = await parseServiceForm(user.id, formData);
  if ("error" in result) return { error: result.error, values: result.raw };

  const record = await createServiceRecord(user.id, vehicleId, result.data);
  if (!record) return { error: "That car wasn't found.", values: result.raw };

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

  redirect(`/garage/${vehicleId}`);
}

export async function removeServiceRecord(vehicleId: string, recordId: string) {
  const user = await requireUser();
  await deleteServiceRecord(user.id, recordId);
  revalidatePath(`/garage/${vehicleId}`);
}
