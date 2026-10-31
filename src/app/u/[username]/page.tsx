import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { listPosts } from "@/lib/community";
import { getProfileByUsername } from "@/lib/profiles";
import { normalizeUsername } from "@/lib/username-rules";
import { PostCard } from "../../community/post-card";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${normalizeUsername(decodeURIComponent(username))} · Revlog` };
}

export default function ProfilePage({ params }: PageProps<"/u/[username]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<p className="text-sm text-steel">Loading…</p>}>
        <ProfilePosts params={params} />
      </Suspense>
    </div>
  );
}

async function ProfilePosts({ params }: Pick<PageProps<"/u/[username]">, "params">) {
  const username = normalizeUsername(decodeURIComponent((await params).username));
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();
  const user = await getUser();
  const userPosts = await listPosts({ username, viewerId: user?.id });

  return (
    <>
      <h1 className="font-display text-4xl leading-none font-semibold">@{profile.username}</h1>
      <p className="mt-2 text-steel">
        {userPosts.length === 0
          ? "No posts yet."
          : `${userPosts.length}${userPosts.length === 20 ? "+" : ""} ${userPosts.length === 1 ? "post" : "posts"}`}
      </p>
      <div className="mt-6 space-y-4">
        {userPosts.map((post) => (
          <PostCard key={post.id} post={post} signedIn={!!user} />
        ))}
      </div>
    </>
  );
}
