import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { PhotoGallery } from "@/components/photo-strip";
import type { FeedPost } from "@/lib/community";
import { modCategoryLabel } from "@/lib/mod-categories";
import { postTagLabel } from "@/lib/post-tags";
import { vehicleName } from "@/lib/vehicles";
import { LikeButton } from "./like-button";

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

// One post in the feed. `link` makes the title open the post page;
// `signedIn` lets the like button work instead of asking to log in.
export function PostCard({
  post,
  link = true,
  signedIn,
}: {
  post: FeedPost;
  link?: boolean;
  signedIn: boolean;
}) {
  const modName = post.modPart ? [post.modBrand, post.modPart].filter(Boolean).join(" ") : null;
  return (
    <article className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
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
          className="ml-auto rounded-md border border-graphite px-2 py-0.5 text-xs text-chalk hover:border-steel"
        >
          {postTagLabel(post.tag)}
        </Link>
      </div>

      <h2 className="mt-3 font-display text-2xl leading-tight font-semibold sm:text-3xl">
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
        <p className={`mt-3 max-w-prose whitespace-pre-line ${link ? "line-clamp-4" : ""}`}>
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
      <div className="mt-3 -ml-2 flex items-center gap-1">
        <LikeButton
          postId={post.id}
          liked={post.liked}
          likeCount={post.likeCount}
          signedIn={signedIn}
        />
        <Link
          href={`/community/${post.id}#comments`}
          className="flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm text-steel hover:bg-graphite hover:text-chalk"
          aria-label={`${post.commentCount} ${post.commentCount === 1 ? "comment" : "comments"}`}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {post.commentCount > 0 && <span>{post.commentCount}</span>}
        </Link>
      </div>
    </article>
  );
}
