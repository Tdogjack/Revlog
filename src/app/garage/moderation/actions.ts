"use server";

import { revalidatePath, updateTag } from "next/cache";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { FEATURED_BUILD_TAG } from "@/lib/community";
import {
  dismissReport,
  isModerator,
  removeContent,
  removeReportedContent,
  restoreUser,
  suspendReportedUser,
  suspendUser,
} from "@/lib/moderation";

// `work` returns an error message when it couldn't be done.
async function moderate(work: () => Promise<string | null | void>) {
  const user = await requireUser();
  if (!isModerator(user.id)) notFound();
  const error = await work();
  if (error) return { error };
  updateTag(FEATURED_BUILD_TAG);
  revalidatePath("/", "layout");
  return {};
}

export async function dismiss(reportId: string) {
  await moderate(() => dismissReport(reportId));
}

export async function removeReported(reportId: string) {
  return moderate(() => removeReportedContent(reportId));
}

export async function suspendReported(reportId: string) {
  return moderate(() => suspendReportedUser(reportId));
}

export async function removeTarget(kind: "post" | "comment", id: string) {
  return moderate(() => removeContent(kind, id));
}

export async function suspendAccount(userId: string) {
  return moderate(() => suspendUser(userId));
}

export async function restoreAccount(userId: string) {
  await moderate(() => restoreUser(userId));
}
