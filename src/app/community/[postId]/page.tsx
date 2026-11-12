import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { getPost, listComments, listInstalledMods, listPostParts } from "@/lib/community";
import { isModerator } from "@/lib/moderation";
import { modCategoryLabel } from "@/lib/mod-categories";
import { Comments } from "../comments";
import { DeletePostButton } from "../delete-post-button";
import { PostCard, postCarName } from "../post-card";

export async function generateMetadata({
  params,
}: PageProps<"/community/[postId]">): Promise<Metadata> {
  const post = await getPost((await params).postId);
  if (!post) return { title: "Post not found · Revlog" };
  return {
    title: `${post.title} · Revlog`,
    description: `@${post.username}'s ${postCarName(post)} on Revlog.`,
    openGraph: post.photos[0] ? { images: [post.photos[0].url] } : undefined,
  };
}

export default function PostPage({ params, searchParams }: PageProps<"/community/[postId]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/community">Community</BackLink>
      <Suspense fallback={<div className="skeleton mt-4 h-[32rem]" aria-busy="true" />}>
        <PostDetails params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PostDetails({
  params,
  searchParams,
}: Pick<PageProps<"/community/[postId]">, "params" | "searchParams">) {
  const [{ postId }, { failed }] = await Promise.all([params, searchParams]);
  const user = await getUser();
  const moderator = !!user && isModerator(user.id);
  const post = await getPost(postId, user?.id, moderator);
  if (!post) notFound();
  const [buildList, sharedParts, comments] = await Promise.all([
    post.kind === "build" ? listInstalledMods(post.vehicleId) : [],
    listPostParts(post),
    listComments(post.id, user?.id, moderator),
  ]);

  return (
    <div className="mt-4 space-y-4">
      {typeof failed === "string" && user?.id === post.userId && (
        <p role="alert" className="rounded-md bg-overdue-bg px-3 py-2 text-sm text-overdue">
          {failed === "1" ? "One photo" : `${failed} photos`} didn&apos;t upload. Try a smaller
          photo, or share again.
        </p>
      )}
      <PostCard
        post={post}
        link={false}
        signedIn={!!user}
        viewerId={user?.id ?? null}
        moderator={moderator}
      />

      {buildList.length > 0 && (
        <section className="rounded-2xl border border-graphite bg-panel p-5 sm:p-6">
          <h2 className="font-display text-2xl font-semibold">Build list</h2>
          <ul className="mt-3">
            {buildList.map((m) => (
              <li key={m.id} className="border-t border-rule py-3 text-sm first:border-t-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span>{[m.brand, m.part].filter(Boolean).join(" ")}</span>
                  <span className="text-xs text-steel">{modCategoryLabel(m.category)}</span>
                </div>
                <SharedParts parts={sharedParts.filter((p) => p.modId === m.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {post.kind === "mod" && sharedParts.length > 0 && (
        <section className="rounded-2xl border border-graphite bg-panel p-5 sm:p-6">
          <h2 className="font-display text-2xl font-semibold">Parts</h2>
          <SharedParts parts={sharedParts} />
        </section>
      )}

      {user?.id === post.userId &&
        (post.tag === "build" ? (
          <div className="flex items-center gap-4">
            <Link
              href={`/community/new?vehicle=${post.vehicleId}&build=1`}
              className="btn"
            >
              Update build
            </Link>
            <DeletePostButton
              postId={post.id}
              label="Take down build"
              confirmText="Take down your public build? The post and its shared photos are removed. You can post it again any time."
            />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href={`/community/${post.id}/edit`} className="btn">
              Edit post
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        ))}

      <Comments
        postId={post.id}
        comments={comments}
        viewerId={user?.id ?? null}
        postOwnerId={post.userId}
        moderator={moderator}
      />
    </div>
  );
}

const money = (amount: string, currency: string | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount));

function SharedParts({ parts }: { parts: Awaited<ReturnType<typeof listPostParts>> }) {
  if (parts.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {parts.map((p) => (
        <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                className="text-chalk underline decoration-graphite underline-offset-2 hover:text-redline"
              >
                {p.name}
              </a>
            ) : (
              <span className="text-chalk">{p.name}</span>
            )}
            {p.quantity > 1 && <span className="text-steel"> x{p.quantity}</span>}
          </span>
          {p.price != null && (
            <span className="shrink-0 text-steel">{money(p.price, p.currency)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
