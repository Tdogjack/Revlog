import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { listPosts } from "@/lib/community";
import { isBlockedBy, isModerator, isSuspended } from "@/lib/moderation";
import { getProfileByUsername } from "@/lib/profiles";
import { normalizeUsername } from "@/lib/username-rules";
import { restoreAccount } from "../../garage/moderation/actions";
import { unblockAccount } from "../../community/actions";
import { ContentMenu } from "../../community/content-menu";
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
  const isOwn = user?.id === profile.userId;
  const moderator = !!user && isModerator(user.id);
  const suspended = moderator && (await isSuspended(profile.userId));
  const blocked = user && !isOwn ? await isBlockedBy(user.id, profile.userId) : false;
  const heading = (
    <div className="flex items-center justify-between gap-3">
      <h1 className="min-w-0 font-display text-4xl font-semibold break-words">
        @{profile.username}
      </h1>
      {!isOwn && (!blocked || moderator) && (
        <ContentMenu
          kind="user"
          targetId={profile.userId}
          userId={profile.userId}
          username={profile.username}
          signedIn={!!user}
          moderator={moderator}
          suspended={suspended}
          loginNext={`/u/${profile.username}`}
        />
      )}
    </div>
  );

  if (blocked && !moderator) {
    return (
      <>
        {heading}
        <p className="mt-2 text-steel">
          You blocked this account, so their posts and comments are hidden.
        </p>
        <form action={unblockAccount.bind(null, profile.userId)} className="mt-4">
          <button type="submit" className="btn">
            Unblock @{profile.username}
          </button>
        </form>
      </>
    );
  }

  const userPosts = await listPosts({ username, viewerId: user?.id, moderator });

  return (
    <>
      {heading}
      {suspended && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-overdue-bg px-3 py-2 text-sm text-overdue">
          <p>Suspended. Only moderators can see these posts.</p>
          <form action={restoreAccount.bind(null, profile.userId)}>
            <button type="submit" className="btn">
              Restore account
            </button>
          </form>
        </div>
      )}
      <p className="mt-2 text-steel">
        {userPosts.length === 0
          ? "No posts yet."
          : `${userPosts.length}${userPosts.length === 20 ? "+" : ""} ${userPosts.length === 1 ? "post" : "posts"}`}
      </p>
      <div className="mt-6 space-y-4">
        {userPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            signedIn={!!user}
            viewerId={user?.id ?? null}
            moderator={moderator}
          />
        ))}
      </div>
    </>
  );
}
