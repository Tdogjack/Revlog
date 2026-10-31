"use client";

import { Trash2 } from "lucide-react";
import { removePost } from "./actions";

export function DeletePostButton({
  postId,
  next = "/community",
  label = "Delete post",
  confirmText = "Delete this post? Its shared photos are removed too.",
}: {
  postId: string;
  next?: string;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={removePost.bind(null, postId, next)}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1 text-sm text-steel hover:text-overdue"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        {label}
      </button>
    </form>
  );
}
