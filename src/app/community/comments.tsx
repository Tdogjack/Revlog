"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { PostComment } from "@/lib/community";
import { ContentMenu } from "./content-menu";
import { postComment, removeComment, type CommentFormState } from "./actions";

const inputClass = "field text-sm";

function timeAgo(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// A post's comment thread. Commenters can delete their own comments, and the
// post's owner can delete any on their post.
export function Comments({
  postId,
  comments,
  viewerId,
  postOwnerId,
  moderator,
}: {
  postId: string;
  comments: PostComment[];
  viewerId: string | null;
  postOwnerId: string;
  moderator: boolean;
}) {
  return (
    <section id="comments" className="scroll-mt-20 rounded-2xl border border-graphite bg-panel p-5 sm:p-6">
      <h2 className="flex items-baseline gap-2 font-display text-2xl font-semibold">
        Comments{comments.length > 0 && <span className="text-steel">{comments.length}</span>}
      </h2>

      {/* The box sits above the thread so it's reachable without scrolling. */}
      {viewerId ? (
        <CommentForm postId={postId} />
      ) : (
        <p className="mt-3 text-sm text-steel">
          <Link
            href={`/login?next=${encodeURIComponent(`/community/${postId}#comments`)}`}
            className="font-semibold text-chalk hover:text-redline"
          >
            Log in
          </Link>{" "}
          to comment.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-steel">No comments yet.</p>
      ) : (
        <ul className="mt-5 border-t border-graphite pt-4">
          {comments.map((c) => (
            <li
              key={c.id}
              id={`comment-${c.id}`}
              className="scroll-mt-20 border-t border-rule py-4 first:border-t-0 first:pt-0 target:bg-carbon"
            >
              <div className="flex items-center gap-2 text-xs text-steel">
                <Link
                  href={`/u/${c.username}`}
                  className="font-semibold text-chalk hover:text-redline"
                >
                  @{c.username}
                </Link>
                <span aria-hidden>·</span>
                <time dateTime={c.createdAt.toISOString()}>{timeAgo(c.createdAt)}</time>
                <div className="ml-auto flex items-center">
                  {viewerId && (viewerId === c.userId || viewerId === postOwnerId) && (
                    <form
                      action={removeComment.bind(null, c.id)}
                      onSubmit={(e) => {
                        if (!confirm("Delete this comment?")) e.preventDefault();
                      }}
                    >
                      <button
                        type="submit"
                        aria-label="Delete comment"
                        title="Delete comment"
                        className="icon-btn icon-btn-danger -my-2 h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </form>
                  )}
                  {viewerId !== c.userId && (
                    <ContentMenu
                      kind="comment"
                      targetId={c.id}
                      userId={c.userId}
                      username={c.username}
                      signedIn={!!viewerId}
                      moderator={moderator}
                      loginNext={`/community/${postId}#comments`}
                    />
                  )}
                </div>
              </div>
              <p className="mt-1 max-w-prose whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState<CommentFormState, FormData>(
    postComment.bind(null, postId),
    undefined,
  );

  // React clears the form after each submit; a failed one puts the text back.
  return (
    <form action={action} className="mt-3 space-y-2">
      <textarea
        name="body"
        rows={2}
        maxLength={1000}
        required
        placeholder="Add a comment…"
        defaultValue={state?.body}
        className={inputClass}
      />
      {state?.error && (
        <p role="alert" className="text-xs text-overdue">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary"
      >
        {pending ? "Posting…" : "Comment"}
      </button>
    </form>
  );
}
