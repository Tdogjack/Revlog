"use server";

import { requireUser } from "@/lib/auth";
import { decodeVin, normalizeVin } from "@/lib/vin";

export async function lookUpVin(vin: string) {
  await requireUser();
  return decodeVin(normalizeVin(vin));
}
