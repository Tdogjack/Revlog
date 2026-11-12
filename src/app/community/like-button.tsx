"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "./actions";

// Flips right away, then settles on the server's count.
export function LikeButton({
  postId,
  liked: initialLiked,
  likeCount: initialCount,
  signedIn,
}: {
  postId: string;
  liked: boolean;
  likeCount: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  // Only a tap pops the heart; a post that loads already liked sits still.
  const [tapped, setTapped] = useState(false);

  function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !liked;
    setTapped(true);
    setLiked(next);
    setLikeCount((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      const result = await toggleLike(postId, next);
      if (!result) {
        setLiked(!next);
        setLikeCount((n) => n + (next ? -1 : 1));
        return;
      }
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm transition-colors hover:bg-graphite active:bg-graphite ${liked ? "text-redline-hover" : "text-steel hover:text-chalk"}`}
    >
      {/* Keyed on the state, so the heart pops on the frame the like lands. */}
      <Heart
        key={String(liked)}
        className={`h-5 w-5 ${liked ? "fill-current" : ""} ${liked && tapped ? "like-pop" : ""}`}
        aria-hidden
      />
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}
