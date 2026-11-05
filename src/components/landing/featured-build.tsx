import { Suspense } from "react";
import { cacheTag } from "next/cache";
import { PostCard } from "@/app/community/post-card";
import { getUser } from "@/lib/auth";
import { FEATURED_BUILD_TAG, getFeaturedBuild, hasLiked } from "@/lib/community";

// A real build from the community, in the hero's second column. The signed-out
// card ships in the static shell, then swaps in once the session is read, so
// the like button works and shows the viewer's own like.
export function FeaturedBuild() {
  return (
    <Suspense fallback={<FeaturedCard signedIn={false} liked={false} />}>
      <ForViewer />
    </Suspense>
  );
}

async function ForViewer() {
  const user = await getUser();
  if (!user) return <FeaturedCard signedIn={false} liked={false} />;
  const post = await getFeaturedBuild();
  const liked = post ? await hasLiked(user.id, post.id) : false;
  return <FeaturedCard signedIn liked={liked} />;
}

// Cached with the post so the timestamps can render in the static shell. Its
// lifetime comes from getFeaturedBuild.
async function FeaturedCard({ signedIn, liked }: { signedIn: boolean; liked: boolean }) {
  "use cache";
  cacheTag(FEATURED_BUILD_TAG);
  const post = await getFeaturedBuild();
  if (!post) return null;
  return <PostCard post={{ ...post, liked }} signedIn={signedIn} />;
}
