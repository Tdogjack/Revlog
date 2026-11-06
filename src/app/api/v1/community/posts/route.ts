import { authed, ok, readBody } from "@/lib/api";
import { postingFailure, postView, refreshCommunity } from "@/lib/api-community";
import type { Feed } from "@/lib/api-types";
import { FEED_PAGE, listPosts } from "@/lib/community";
import { publishPost } from "@/lib/community-rules";
import { DEFAULT_SORT, isPostSort } from "@/lib/post-sorts";
import { isPostTag } from "@/lib/post-tags";

export const GET = authed(async ({ user, request }) => {
  const query = request.nextUrl.searchParams;
  const sort = query.get("sort") ?? "";
  const tag = query.get("tag") ?? "";
  const posts = await listPosts({
    sort: isPostSort(sort) ? sort : DEFAULT_SORT,
    page: Math.max(1, Number(query.get("page")) || 1),
    tag: isPostTag(tag) ? tag : undefined,
    q: query.get("q")?.slice(0, 100) || undefined,
    viewerId: user.id,
  });
  return ok<Feed>({ posts: posts.map(postView), hasMore: posts.length === FEED_PAGE });
});

export const POST = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const result = await publishPost(user.id, {
    vehicleId: String(body.vehicleId ?? ""),
    modId: typeof body.modId === "string" && body.modId ? body.modId : null,
    title: String(body.title ?? "").trim(),
    body: String(body.body ?? "").trim(),
    tag: String(body.tag ?? ""),
    photoIds: Array.isArray(body.photoIds) ? body.photoIds.map(String) : [],
    showParts: body.showParts === true,
  });
  if (!("id" in result)) return postingFailure(result);
  refreshCommunity();
  return ok({ id: result.id }, 201);
});
