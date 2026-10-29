import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { getPost, listInstalledMods } from "@/lib/community";
import { modCategoryLabel } from "@/lib/mod-categories";
import { DeletePostButton } from "../delete-post-button";
import { PostCard, postCarName } from "../post-card";

export async function generateMetadata({
  params,
}: PageProps<"/community/[postId]">): Promise<Metadata> {
  const post = await getPost((await params).postId);
  if (!post) return { title: "Post not found · Revlog" };
  return {
    title: `${post.title} · Revlog`,
    description: `@${post.username}'s ${postCarName(post)} on Revlog.`,
    openGraph: post.photos[0] ? { images: [post.photos[0].url] } : undefined,
  };
}

export default function PostPage({ params }: PageProps<"/community/[postId]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/community" className="text-sm text-steel hover:text-chalk">
        ← Back to community
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading post…</p>}>
        <PostDetails params={params} />
      </Suspense>
    </div>
  );
}

async function PostDetails({ params }: Pick<PageProps<"/community/[postId]">, "params">) {
  const { postId } = await params;
  const [post, user] = await Promise.all([getPost(postId), getUser()]);
  if (!post) notFound();
  const buildList = post.kind === "build" ? await listInstalledMods(post.vehicleId) : [];

  return (
    <div className="mt-4 space-y-4">
      <PostCard post={post} link={false} />

      {buildList.length > 0 && (
        <section className="rounded-xl border border-graphite bg-panel p-5">
          <h2 className="font-medium">Build list</h2>
          <ul className="mt-3">
            {buildList.map((m) => (
              <li
                key={m.id}
                className="flex items-baseline justify-between gap-3 border-t border-graphite py-2 text-sm"
              >
                <span>{[m.brand, m.part].filter(Boolean).join(" ")}</span>
                <span className="text-xs text-steel">{modCategoryLabel(m.category)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {user?.id === post.userId && <DeletePostButton postId={post.id} />}
    </div>
  );
}
