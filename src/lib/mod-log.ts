import "server-only";
import { createMod, modInput, updateMod, type ModInput } from "@/lib/mods";
import { parsePartRows, settlePartsCost, syncParts } from "@/lib/parts";

const FIELDS = [
  "part",
  "brand",
  "category",
  "status",
  "cost",
  "installedOn",
  "installedMileage",
  "notes",
];

// Form values. `parts` is left out when the caller isn't changing them.
export type ModFields = Record<string, string> & { parts?: string };

// `read` gets one value from a form or JSON body. A missing parts list stays
// missing, because syncing an empty list would delete the saved parts.
export function readModFields(read: (key: string) => unknown): ModFields {
  const fields: ModFields = Object.fromEntries(FIELDS.map((k) => [k, String(read(k) ?? "")]));
  const parts = read("parts");
  if (parts != null) fields.parts = String(parts);
  return fields;
}

type PartRows = Parameters<typeof syncParts>[3];

function parseFields(raw: ModFields): { error: string } | { data: ModInput; parts: PartRows | null } {
  const parsed = modInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const partRows = raw.parts === undefined ? null : parsePartRows(raw.parts);
  if (partRows && "error" in partRows) return { error: partRows.error };
  return { data: parsed.data, parts: partRows?.rows ?? null };
}

async function savePartsAndCost(
  userId: string,
  vehicleId: string,
  modId: string,
  parts: PartRows | null,
  costGiven: boolean,
) {
  const parent = { modId };
  const toCheck = parts ? await syncParts(userId, vehicleId, parent, parts) : [];
  await settlePartsCost(userId, parent, toCheck, costGiven);
}

export async function logMod(
  userId: string,
  vehicleId: string,
  raw: ModFields,
): Promise<{ error: string } | { id: string }> {
  const fields = parseFields(raw);
  if ("error" in fields) return { error: fields.error };
  const mod = await createMod(userId, vehicleId, fields.data);
  if (!mod) return { error: "That car wasn't found." };
  await savePartsAndCost(userId, vehicleId, mod.id, fields.parts, fields.data.cost != null);
  return { id: mod.id };
}

// Returns an error message, or null once saved.
export async function editModEntry(
  userId: string,
  vehicleId: string,
  modId: string,
  raw: ModFields,
): Promise<string | null> {
  const fields = parseFields(raw);
  if ("error" in fields) return fields.error;
  const mod = await updateMod(userId, vehicleId, modId, fields.data);
  if (!mod) return "That mod wasn't found.";
  await savePartsAndCost(userId, vehicleId, mod.id, fields.parts, fields.data.cost != null);
  return null;
}
