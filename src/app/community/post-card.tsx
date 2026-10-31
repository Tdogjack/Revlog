import Link from "next/link";
import { PhotoGallery } from "@/components/photo-strip";
import type { FeedPost } from "@/lib/community";
import { modCategoryLabel } from "@/lib/mod-categories";
import { postTagLabel, postTagTone } from "@/lib/post-tags";
import { vehicleName } from "@/lib/vehicles";

export function timeAgo(date: Date, now = new Date()) {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function postCarName(post: FeedPost) {
  const full = vehicleName(post);
  return post.nickname ? `${post.nickname} (${full})` : full;
}

// One post in the feed. `link` makes the title open the post page.
export function PostCard({ post, link = true }: { post: FeedPost; link?: boolean }) {
  const modName = post.modPart ? [post.modBrand, post.modPart].filter(Boolean).join(" ") : null;
  return (
    <article className="rounded-xl border border-graphite bg-panel p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-steel">
        <Link href={`/u/${post.username}`} className="font-medium text-chalk hover:text-redline">
          @{post.username}
        </Link>
        <span aria-hidden>·</span>
        <span>{postCarName(post)}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.createdAt.toISOString()}>{timeAgo(post.createdAt)}</time>
        {post.tag === "build" && post.updatedAt.getTime() - post.createdAt.getTime() > 60_000 && (
          <>
            <span aria-hidden>·</span>
            <time dateTime={post.updatedAt.toISOString()}>updated {timeAgo(post.updatedAt)}</time>
          </>
        )}
        <Link
          href={`/community?tag=${post.tag}`}
          className={`ml-auto rounded px-2 py-0.5 text-xs hover:opacity-80 ${postTagTone(post.tag)}`}
        >
          {postTagLabel(post.tag)}
        </Link>
      </div>

      <h2 className="mt-3 text-lg font-semibold">
        {link ? (
          <Link href={`/community/${post.id}`} className="hover:text-redline">
            {post.title}
          </Link>
        ) : (
          post.title
        )}
      </h2>
      {modName && (
        <p className="mt-1 text-sm text-steel">
          {modName} · {modCategoryLabel(post.modCategory)}
        </p>
      )}
      {post.body && (
        <p className={`mt-3 whitespace-pre-line text-sm ${link ? "line-clamp-4" : ""}`}>
          {post.body}
        </p>
      )}
      {link && post.showParts && (
        <Link
          href={`/community/${post.id}`}
          className="mt-2 inline-block text-xs text-steel hover:text-chalk"
        >
          Parts list with links
        </Link>
      )}
      {post.photos.length > 0 && (
        <div className="mt-4">
          <PhotoGallery photos={post.photos} />
        </div>
      )}
    </article>
  );
}
