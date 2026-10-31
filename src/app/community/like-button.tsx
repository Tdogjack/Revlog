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

  function toggle() {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !liked;
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
      className={`flex items-center gap-1.5 text-sm ${liked ? "text-redline" : "text-steel hover:text-chalk"}`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} aria-hidden />
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}
