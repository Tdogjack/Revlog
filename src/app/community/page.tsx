import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Share2, Users } from "lucide-react";
import { FEED_PAGE, listPosts } from "@/lib/community";
import { PostCard } from "./post-card";

export const metadata: Metadata = {
  title: "Community · Revlog",
  description: "Builds and new mods shared by Revlog drivers.",
};

export default function CommunityPage({ searchParams }: PageProps<"/community">) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-6 w-6 text-redline" aria-hidden />
            Community
          </h1>
          <p className="mt-1 text-sm text-steel">Builds and fresh mods from Revlog drivers.</p>
        </div>
        <Link
          href="/community/new"
          className="flex items-center gap-1 rounded-md bg-redline px-3 py-2 text-sm font-medium text-white hover:bg-redline-hover"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Share your build
        </Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading posts…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/community">, "searchParams">) {
  const { before } = await searchParams;
  const beforeDate = typeof before === "string" ? new Date(before) : undefined;
  const feed = await listPosts({
    before: beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : undefined,
  });

  if (feed.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-graphite p-10 text-center">
        <p className="font-medium">{before ? "No older posts." : "No posts yet."}</p>
        <p className="mt-1 text-sm text-steel">
          Share your build or a mod you just installed to get things started.
        </p>
      </div>
    );
  }

  const oldest = feed[feed.length - 1].createdAt;
  return (
    <>
      <div className="mt-6 space-y-4">
        {feed.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {feed.length === FEED_PAGE && (
        <Link
          href={`/community?before=${encodeURIComponent(oldest.toISOString())}`}
          className="mt-6 block text-center text-sm text-steel hover:text-chalk"
        >
          Older posts
        </Link>
      )}
    </>
  );
}
