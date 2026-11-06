import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search, Share2, X } from "lucide-react";
import { getUser } from "@/lib/auth";
import { isModerator } from "@/lib/moderation";
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
          <h1 className="font-display text-4xl leading-tight font-semibold">Community</h1>
          <p className="mt-2 text-steel">Builds and fresh mods from Revlog drivers.</p>
        </div>
        <Link href="/community/new" className="btn btn-primary">
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </Link>
      </div>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Builds a feed link that keeps whichever filters aren't being changed.
function feedHref({
  q,
  tag,
  sort,
  page,
}: {
  q?: string;
  tag?: string;
  sort: PostSort;
  page?: number;
}) {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (tag) query.set("tag", tag);
  if (sort !== DEFAULT_SORT) query.set("sort", sort);
  if (page && page > 1) query.set("page", String(page));
  return query.size ? `/community?${query}` : "/community";
}

async function Feed({ searchParams }: Pick<PageProps<"/community">, "searchParams">) {
  const { q: rawQ, tag: rawTag, sort: rawSort, page: rawPage } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) || undefined : undefined;
  const tag = typeof rawTag === "string" && isPostTag(rawTag) ? rawTag : undefined;
  const sort = typeof rawSort === "string" && isPostSort(rawSort) ? rawSort : DEFAULT_SORT;
  const page = Math.max(1, Number.parseInt(typeof rawPage === "string" ? rawPage : "", 10) || 1);
  const user = await getUser();
  const moderator = !!user && isModerator(user.id);
  const feed = await listPosts({ sort, page, tag, q, viewerId: user?.id });

  const controls = (
    <>
      {/* A plain GET form, so searches are links you can refresh or share. */}
      <div className="mt-6 flex items-center gap-2">
        <form action="/community" role="search" className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            key={q}
            maxLength={100}
            placeholder="Search posts, cars, mods, or @usernames"
            aria-label="Search the community"
            className="field pr-10 pl-9 text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {tag && <input type="hidden" name="tag" value={tag} />}
          {sort !== DEFAULT_SORT && <input type="hidden" name="sort" value={sort} />}
          {q && (
            <Link
              href={feedHref({ tag, sort })}
              aria-label="Clear search"
              className="icon-btn absolute top-1/2 right-0.5 -translate-y-1/2"
            >
              <X className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </form>
        <SortMenu sort={sort} tag={tag} q={q} />
      </div>
      <nav aria-label="Filter by tag" className="mt-3 flex flex-wrap gap-1.5">
        {[{ value: undefined, label: "All" }, ...POST_TAGS].map((t) => {
          const active = t.value === tag;
          return (
            <Link
              key={t.label}
              href={feedHref({ q, tag: t.value, sort })}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-8 items-center rounded-md border px-3 text-sm ${active ? "border-chalk/60 bg-graphite text-chalk" : "border-transparent text-steel hover:bg-graphite/60 hover:text-chalk"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  if (feed.length === 0) {
    return (
      <>
        {controls}
        <div className="mt-6 rounded-lg border border-dashed border-graphite px-6 py-12 text-center">
          <p className="font-display text-2xl leading-tight font-semibold">
            {page > 1
              ? "No more posts."
              : q
                ? `No posts match "${q}".`
                : sort === "rising"
                  ? "Nothing rising in the last 3 days."
                  : tag
                    ? `No ${postTagLabel(tag).toLowerCase()} posts yet.`
                    : "No posts yet."}
          </p>
          <p className="mt-1 text-sm text-steel">
            {q
              ? "Try fewer or different words."
              : "Share your build or a mod you just installed to get things started."}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {controls}
      <div className="mt-6 space-y-4">
        {feed.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            signedIn={!!user}
            viewerId={user?.id ?? null}
            moderator={moderator}
          />
        ))}
      </div>
      {(page > 1 || feed.length === FEED_PAGE) && (
        <nav aria-label="Pages" className="mt-8 flex justify-between text-sm">
          {page > 1 ? (
            <Link href={feedHref({ q, tag, sort, page: page - 1 })} className="btn">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {feed.length === FEED_PAGE && (
            <Link href={feedHref({ q, tag, sort, page: page + 1 })} className="btn">
              More posts →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading posts">
      <div className="skeleton h-10" />
      <div className="skeleton h-96" />
      <div className="skeleton h-96" />
    </div>
  );
}
