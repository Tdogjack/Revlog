import "server-only";
import { and, asc, count, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accountSuspensions,
  contentReports,
  postComments,
  postPhotos,
  posts,
  profiles,
  userBlocks,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { moderationEmail } from "@/lib/email-templates";
import { reportReasonLabel, type ReportKind } from "@/lib/report-reasons";
import { CONTACT_EMAIL, siteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/vehicles";

const REPORTS_PER_DAY = 20;

// Comma-separated user ids. An id can't be claimed by signing up, unlike an email.
export function isModerator(userId: string) {
  return (process.env.MODERATOR_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .includes(userId);
}

export async function isSuspended(userId: string) {
  const [row] = await db
    .select({ userId: accountSuspensions.userId })
    .from(accountSuspensions)
    .where(eq(accountSuspensions.userId, userId));
  return Boolean(row);
}

export const SUSPENDED_MESSAGE = `Your account can't post in the community. Email ${CONTACT_EMAIL} if you think this is a mistake.`;

// A failed email isn't fatal: every report also lands in the moderation queue.
async function tellModerators(subject: string, lines: string[], path: string) {
  await sendEmail({
    to: CONTACT_EMAIL,
    ...moderationEmail({ subject, lines, url: `${siteUrl()}${path}` }),
  });
}

export async function isBlockedBy(blockerId: string, userId: string) {
  const [row] = await db
    .select({ id: userBlocks.id })
    .from(userBlocks)
    .where(and(eq(userBlocks.userId, blockerId), eq(userBlocks.blockedUserId, userId)));
  return Boolean(row);
}

// Returns an error message, or null once the block is in place.
export async function blockUser(userId: string, blockedUserId: string) {
  if (!isUuid(blockedUserId)) return "That account wasn't found.";
  if (userId === blockedUserId) return "You can't block yourself.";
  const [[target], [blocker]] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, blockedUserId)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
  ]);
  if (!target) return "That account wasn't found.";
  const added = await db
    .insert(userBlocks)
    .values({ userId, blockedUserId })
    .onConflictDoNothing()
    .returning({ id: userBlocks.id });
  if (added.length) {
    await tellModerators(
      `Block: @${target.username}`,
      [`@${blocker?.username ?? "unknown"} blocked @${target.username}.`],
      `/u/${target.username}`,
    );
  }
  return null;
}

export async function unblockUser(userId: string, blockedUserId: string) {
  if (!isUuid(blockedUserId)) return;
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.userId, userId), eq(userBlocks.blockedUserId, blockedUserId)));
}

export function listBlockedUsers(userId: string) {
  return db
    .select({ userId: profiles.userId, username: profiles.username })
    .from(userBlocks)
    .innerJoin(profiles, eq(profiles.userId, userBlocks.blockedUserId))
    .where(eq(userBlocks.userId, userId))
    .orderBy(asc(profiles.username));
}

// What a report points at, or null if it's gone.
async function findTarget(kind: ReportKind, id: string) {
  if (kind === "post") {
    const [row] = await db
      .select({
        userId: posts.userId,
        username: profiles.username,
        title: posts.title,
        body: posts.body,
      })
      .from(posts)
      .innerJoin(profiles, eq(profiles.userId, posts.userId))
      .where(eq(posts.id, id));
    if (!row) return null;
    return {
      userId: row.userId,
      username: row.username,
      path: `/community/${id}`,
      snapshot: [row.title, row.body].filter(Boolean).join("\n\n"),
    };
  }
  if (kind === "comment") {
    const [row] = await db
      .select({
        userId: postComments.userId,
        username: profiles.username,
        body: postComments.body,
        postId: postComments.postId,
      })
      .from(postComments)
      .innerJoin(profiles, eq(profiles.userId, postComments.userId))
      .where(eq(postComments.id, id));
    if (!row) return null;
    return {
      userId: row.userId,
      username: row.username,
      path: `/community/${row.postId}#comments`,
      snapshot: row.body,
    };
  }
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, id));
  if (!row) return null;
  return { userId: row.userId, username: row.username, path: `/u/${row.username}`, snapshot: null };
}

// Returns an error message, or null once the report is filed.
export async function createReport(
  reporterId: string,
  kind: ReportKind,
  targetId: string,
  reason: string,
  details: string | null,
) {
  if (!isUuid(targetId)) return "That's no longer available to report.";
  const target = await findTarget(kind, targetId);
  if (!target) return "That's no longer available to report.";
  if (target.userId === reporterId) return "You can't report yourself.";

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(contentReports)
    .where(and(eq(contentReports.reporterId, reporterId), gt(contentReports.createdAt, since)));
  if (n >= REPORTS_PER_DAY) {
    return `That's the report limit for today. Email ${CONTACT_EMAIL} if something needs attention now.`;
  }

  const added = await db
    .insert(contentReports)
    .values({
      reporterId,
      targetType: kind,
      targetId,
      reportedUserId: target.userId,
      reportedUsername: target.username,
      targetPath: target.path,
      contentSnapshot: target.snapshot,
      reason,
      details,
    })
    .onConflictDoNothing()
    .returning({ id: contentReports.id });
  if (added.length) {
    await tellModerators(
      `Report: ${kind} by @${target.username}`,
      [
        `Reason: ${reportReasonLabel(reason)}`,
        ...(details ? [`Details: ${details}`] : []),
        ...(target.snapshot ? [`Reported text: ${target.snapshot}`] : []),
      ],
      "/garage/moderation",
    );
  }
  return null;
}

export type OpenReport = Awaited<ReturnType<typeof listOpenReports>>[number];

// Open reports, oldest first. `gone` marks content that no longer exists.
export async function listOpenReports() {
  const rows = await db
    .select({
      id: contentReports.id,
      createdAt: contentReports.createdAt,
      targetType: contentReports.targetType,
      targetId: contentReports.targetId,
      reportedUserId: contentReports.reportedUserId,
      reportedUsername: contentReports.reportedUsername,
      targetPath: contentReports.targetPath,
      contentSnapshot: contentReports.contentSnapshot,
      reason: contentReports.reason,
      details: contentReports.details,
      reporter: profiles.username,
    })
    .from(contentReports)
    .leftJoin(profiles, eq(profiles.userId, contentReports.reporterId))
    .where(eq(contentReports.status, "open"))
    .orderBy(asc(contentReports.createdAt));

  const idsOf = (type: ReportKind) =>
    rows.filter((r) => r.targetType === type).map((r) => r.targetId);
  const [livePosts, liveComments] = await Promise.all([
    idsOf("post").length
      ? db.select({ id: posts.id }).from(posts).where(inArray(posts.id, idsOf("post")))
      : [],
    idsOf("comment").length
      ? db
          .select({ id: postComments.id })
          .from(postComments)
          .where(inArray(postComments.id, idsOf("comment")))
      : [],
  ]);
  const live = new Set([...livePosts, ...liveComments].map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    gone: r.targetType === "user" ? !r.reportedUserId : !live.has(r.targetId),
  }));
}

export async function countOpenReports() {
  const [{ n }] = await db
    .select({ n: count() })
    .from(contentReports)
    .where(eq(contentReports.status, "open"));
  return n;
}

export function listSuspendedUsers() {
  return db
    .select({ userId: profiles.userId, username: profiles.username })
    .from(accountSuspensions)
    .innerJoin(profiles, eq(profiles.userId, accountSuspensions.userId))
    .orderBy(desc(accountSuspensions.createdAt));
}

// Closes every open report on one post, comment, or account.
async function closeTargetReports(
  targetType: ReportKind,
  targetId: string,
  status: "actioned" | "dismissed",
) {
  await db
    .update(contentReports)
    .set({ status, resolvedAt: new Date() })
    .where(
      and(
        eq(contentReports.targetType, targetType),
        eq(contentReports.targetId, targetId),
        eq(contentReports.status, "open"),
      ),
    );
}

async function getReport(reportId: string) {
  if (!isUuid(reportId)) return null;
  const [report] = await db.select().from(contentReports).where(eq(contentReports.id, reportId));
  return report ?? null;
}

export async function dismissReport(reportId: string) {
  const report = await getReport(reportId);
  if (report) await closeTargetReports(report.targetType, report.targetId, "dismissed");
}

// Deletes a post or comment, and closes any reports on it.
export async function removeContent(kind: "post" | "comment", id: string) {
  if (!isUuid(id)) return;
  if (kind === "comment") {
    await db.delete(postComments).where(eq(postComments.id, id));
  } else {
    const files = await db
      .select({ path: postPhotos.storagePath })
      .from(postPhotos)
      .where(eq(postPhotos.postId, id));
    await db.delete(posts).where(eq(posts.id, id));
    if (files.length) {
      await createAdminClient()
        ?.storage.from("community-photos")
        .remove(files.map((f) => f.path));
    }
  }
  await closeTargetReports(kind, id, "actioned");
}

// Removes what a report points at. Returns an error message, or null.
export async function removeReportedContent(reportId: string) {
  const report = await getReport(reportId);
  if (!report) return "That report wasn't found.";
  if (report.targetType === "user") return "That report has nothing to remove.";
  await removeContent(report.targetType, report.targetId);
  return null;
}

// Hides the account's posts and comments and stops them posting. Their private
// garage is left alone. Settles every open report against them. Returns an
// error message, or null.
export async function suspendUser(userId: string) {
  if (!isUuid(userId)) return "That account wasn't found.";
  if (isModerator(userId)) return "Moderator accounts can't be suspended.";
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profile) return "That account wasn't found.";
  await db.insert(accountSuspensions).values({ userId }).onConflictDoNothing();
  await db
    .update(contentReports)
    .set({ status: "actioned", resolvedAt: new Date() })
    .where(and(eq(contentReports.reportedUserId, userId), eq(contentReports.status, "open")));
  return null;
}

export async function suspendReportedUser(reportId: string) {
  const report = await getReport(reportId);
  if (!report?.reportedUserId) return "That account no longer exists.";
  return suspendUser(report.reportedUserId);
}

export async function restoreUser(userId: string) {
  if (!isUuid(userId)) return;
  await db.delete(accountSuspensions).where(eq(accountSuspensions.userId, userId));
}
