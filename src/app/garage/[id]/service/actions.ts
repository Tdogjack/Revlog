"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/service-categories";
import {
  createServiceRecord,
  deleteServiceRecord,
  serviceRecordInput,
} from "@/lib/service-records";
import { listServiceTypes, resolveServiceType } from "@/lib/service-types";

export type ServiceFormState = { error?: string; values?: Record<string, string> } | undefined;

const FIELDS = [
  "category",
  "newType",
  "title",
  "servicedOn",
  "mileage",
  "cost",
  "shop",
  "notes",
];

export async function addServiceRecord(
  vehicleId: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));

  const type = await resolveServiceType(user.id, raw.category, raw.newType);
  if ("error" in type) return { error: type.error, values: raw };

  const parsed = serviceRecordInput.safeParse({ ...raw, category: type.key });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: raw };

  const title = parsed.data.title || categoryLabel(type.key, await listServiceTypes(user.id));
  const record = await createServiceRecord(user.id, vehicleId, { ...parsed.data, title });
  if (!record) return { error: "That car wasn't found.", values: raw };

  redirect(`/garage/${vehicleId}`);
}

export async function removeServiceRecord(vehicleId: string, recordId: string) {
  const user = await requireUser();
  await deleteServiceRecord(user.id, recordId);
  revalidatePath(`/garage/${vehicleId}`);
}
