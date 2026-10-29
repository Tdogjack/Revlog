"use client";

import { Trash2 } from "lucide-react";
import { removePost } from "./actions";

export function DeletePostButton({ postId }: { postId: string }) {
  return (
    <form
      action={removePost.bind(null, postId)}
      onSubmit={(e) => {
        if (!confirm("Delete this post? Its shared photos are removed too.")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1 text-sm text-steel hover:text-overdue"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Delete post
      </button>
    </form>
  );
}
