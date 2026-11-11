import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { countShareableParts, getPost, MAX_POST_PHOTOS } from "@/lib/community";
import { isEmailVerified } from "@/lib/email-verification";
import { listPhotosForVehicle } from "@/lib/gallery";
import { signedPhotoUrls } from "@/lib/photos";
import { getVehicle, vehicleName } from "@/lib/vehicles";
import { savePostEdits } from "../../actions";
import { ShareForm } from "../../new/share-form";

export const metadata: Metadata = { title: "Edit post · Revlog" };

export default function EditPostPage({ params }: PageProps<"/community/[postId]/edit">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading…</p>}>
        <EditPost params={params} />
      </Suspense>
    </div>
  );
}

async function EditPost({ params }: Pick<PageProps<"/community/[postId]/edit">, "params">) {
  const { postId } = await params;
  const user = await requireUser();
  const post = await getPost(postId, user.id);
  if (!post || post.userId !== user.id) notFound();
  // Builds have their own editor, kept in step with the car.
  if (post.tag === "build") redirect(`/community/new?vehicle=${post.vehicleId}&build=1`);

  const car = await getVehicle(user.id, post.vehicleId);
  const gallery = car
    ? (await listPhotosForVehicle(user.id, car.id)).filter(
        (p) => !p.serviceRecordId && (!post.modId || p.modId === null || p.modId === post.modId),
      )
    : [];
  const [urls, partCount, canUpload] = await Promise.all([
    signedPhotoUrls(gallery.map((p) => p.storagePath)),
    countShareableParts(user.id, post.vehicleId, post.modId),
    isEmailVerified(user.id),
  ]);
  const photos = gallery.flatMap((p) => {
    const url = urls.get(p.storagePath);
    return url ? [{ id: p.id, url, fromMod: !!post.modId && p.modId === post.modId }] : [];
  });

  return (
    <>
      <Link
        href={`/community/${post.id}`}
        className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk"
      >
        ← Back to post
      </Link>
      <h1 className="mt-4 font-display text-4xl leading-tight font-semibold">Edit post</h1>
      <p className="mt-2 text-steel">
        {car ? (car.nickname ?? vehicleName(car)) : "Your car"}. Changes show on the post right
        away.
      </p>
      <ShareForm
        action={savePostEdits.bind(null, post.id)}
        vehicleId={post.vehicleId}
        modId={post.modId}
        defaultTitle={post.title}
        defaultBody={post.body ?? undefined}
        defaultShowParts={post.showParts}
        defaultTag={post.tag}
        photos={photos}
        currentPhotos={post.photos}
        maxPhotos={MAX_POST_PHOTOS}
        partCount={partCount}
        partScope={post.modId ? "this mod" : "your installed mods"}
        canUpload={canUpload}
        submitLabel="Save changes"
      />
    </>
  );
}
