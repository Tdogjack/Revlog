"use server";

import { revalidatePath } from "next/cache";
import { grantAiConsent, hasAiConsent, withdrawAiConsent } from "@/lib/ai-consent";
import { requireUser } from "@/lib/auth";

export async function checkAiConsent() {
  const user = await requireUser();
  return hasAiConsent(user.id);
}

export async function allowAiScans() {
  const user = await requireUser();
  await grantAiConsent(user.id);
  revalidatePath("/garage/settings");
}

export async function stopAiScans() {
  const user = await requireUser();
  await withdrawAiConsent(user.id);
  revalidatePath("/garage/settings");
}
