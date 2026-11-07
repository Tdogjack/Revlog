"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveHistoryRows, type SaveHistoryResult } from "@/lib/history-save";
import { scanHistoryFile, scanHistoryText, type HistoryScanResult } from "@/lib/history-scan";
import { scanBlocked } from "@/lib/scan-gate";
import { listServiceTypes } from "@/lib/service-types";

// Reads a photo or PDF into draft records. Nothing is saved here.
export async function scanHistory(formData: FormData): Promise<HistoryScanResult> {
  const user = await requireUser();
  const blocked = await scanBlocked(user.id);
  if (blocked) return { error: blocked };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  return scanHistoryFile(user.id, file, await listServiceTypes(user.id));
}

// Reads a spreadsheet the column matching couldn't follow. Nothing is saved here.
export async function scanHistorySheet(text: string): Promise<HistoryScanResult> {
  const user = await requireUser();
  const blocked = await scanBlocked(user.id);
  if (blocked) return { error: blocked };
  return scanHistoryText(user.id, text, await listServiceTypes(user.id));
}

export type { SaveHistoryResult };

// Saves the rows the user kept, all of them or none.
export async function saveServiceHistory(
  vehicleId: string,
  json: string,
): Promise<SaveHistoryResult> {
  const user = await requireUser();
  const result = await saveHistoryRows(user.id, vehicleId, json);
  if ("saved" in result) {
    revalidatePath(`/garage/${vehicleId}`);
    revalidatePath("/garage");
  }
  return result;
}
