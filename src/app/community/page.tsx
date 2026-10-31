import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Share2, Users } from "lucide-react";
import { getUser } from "@/lib/auth";
import { FEED_PAGE, listPosts } from "@/lib/community";
import { DEFAULT_SORT, isPostSort, type PostSort } from "@/lib/post-sorts";
import { isPostTag, POST_TAGS, postTagLabel } from "@/lib/post-tags";
import { PostCard } from "./post-card";
import { SortMenu } from "./sort-menu";

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
          Share
        </Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading posts…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Builds a feed link that keeps whichever filters aren't being changed.
function feedHref({ tag, sort, page }: { tag?: string; sort: PostSort; page?: number }) {
  const query = new URLSearchParams();
  if (tag) query.set("tag", tag);
  if (sort !== DEFAULT_SORT) query.set("sort", sort);
  if (page && page > 1) query.set("page", String(page));
  return query.size ? `/community?${query}` : "/community";
}

async function Feed({ searchParams }: Pick<PageProps<"/community">, "searchParams">) {
  const { tag: rawTag, sort: rawSort, page: rawPage } = await searchParams;
  const tag = typeof rawTag === "string" && isPostTag(rawTag) ? rawTag : undefined;
  const sort = typeof rawSort === "string" && isPostSort(rawSort) ? rawSort : DEFAULT_SORT;
  const page = Math.max(1, Number.parseInt(typeof rawPage === "string" ? rawPage : "", 10) || 1);
  const user = await getUser();
  const feed = await listPosts({ sort, page, tag, viewerId: user?.id });

  const controls = (
    <>
      <nav aria-label="Filter by tag" className="mt-5 flex flex-wrap gap-2">
        {[{ value: undefined, label: "All" }, ...POST_TAGS].map((t) => {
          const active = t.value === tag;
          return (
            <Link
              key={t.label}
              href={feedHref({ tag: t.value, sort })}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-xs ${active ? "border-redline bg-redline/15 text-chalk" : "border-graphite text-steel hover:border-steel hover:text-chalk"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4">
        <SortMenu sort={sort} tag={tag} />
      </div>
    </>
  );

  if (feed.length === 0) {
    return (
      <>
        {controls}
        <div className="mt-4 rounded-xl border border-dashed border-graphite p-10 text-center">
          <p className="font-medium">
            {page > 1
              ? "No more posts."
              : sort === "rising"
                ? "Nothing rising in the last 3 days."
                : tag
                  ? `No ${postTagLabel(tag).toLowerCase()} posts yet.`
                  : "No posts yet."}
          </p>
          <p className="mt-1 text-sm text-steel">
            Share your build or a mod you just installed to get things started.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {controls}
      <div className="mt-4 space-y-4">
        {feed.map((post) => (
          <PostCard key={post.id} post={post} signedIn={!!user} />
        ))}
      </div>
      {(page > 1 || feed.length === FEED_PAGE) && (
        <nav aria-label="Pages" className="mt-6 flex justify-between text-sm text-steel">
          {page > 1 ? (
            <Link href={feedHref({ tag, sort, page: page - 1 })} className="hover:text-chalk">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {feed.length === FEED_PAGE && (
            <Link href={feedHref({ tag, sort, page: page + 1 })} className="hover:text-chalk">
              More posts →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
