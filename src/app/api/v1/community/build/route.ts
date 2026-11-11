import { authed, fail, ok, readBody } from "@/lib/api";
import { postingFailure, refreshCommunity } from "@/lib/api-community";
import type { BuildDraft } from "@/lib/api-types";
import {
  countShareableParts,
  getBuildPostId,
  getPost,
  MAX_POST_PHOTOS,
} from "@/lib/community";
import { publishBuild } from "@/lib/community-rules";
import { listPhotosForVehicle } from "@/lib/gallery";
import { signedPhotoUrls, signedThumbUrls } from "@/lib/photos";
import { getVehicle, vehicleName } from "@/lib/vehicles";

const ids = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

// Everything the app needs to post a car's public build, or update it.
export const GET = authed(async ({ user, request }) => {
  const car = await getVehicle(user.id, request.nextUrl.searchParams.get("vehicleId") ?? "");
  if (!car) return fail("That car wasn't found.", 404);

  const buildId = await getBuildPostId(user.id, car.id);
  const post = buildId ? await getPost(buildId, user.id) : null;
  const gallery = (await listPhotosForVehicle(user.id, car.id)).filter((p) => !p.serviceRecordId);
  const [urls, thumbs, partCount] = await Promise.all([
    signedPhotoUrls(gallery.map((p) => p.storagePath)),
    signedThumbUrls(gallery.map((p) => p.storagePath)),
    countShareableParts(user.id, car.id, null),
  ]);

  return ok<BuildDraft>({
    post: post && {
      id: post.id,
      title: post.title,
      body: post.body,
      showParts: post.showParts,
      photos: post.photos,
    },
    defaultTitle: `My ${vehicleName(car)} build`,
    partCount,
    maxPhotos: MAX_POST_PHOTOS,
    gallery: gallery.flatMap((p) => {
      const url = urls.get(p.storagePath);
      return url ? [{ id: p.id, url, thumbUrl: thumbs.get(p.storagePath) ?? url }] : [];
    }),
  });
});

// Each car has one public build: this posts it, or updates the one it has.
export const PUT = authed(async ({ user, request }) => {
  const body = await readBody(request);
  const result = await publishBuild(user.id, {
    vehicleId: String(body.vehicleId ?? ""),
    title: String(body.title ?? "").trim(),
    body: String(body.body ?? "").trim(),
    showParts: body.showParts === true,
    photoIds: ids(body.photoIds),
    keepPhotoIds: ids(body.keepPhotoIds),
  });
  if (!("id" in result)) return postingFailure(result);
  refreshCommunity();
  return ok({ id: result.id, added: result.added });
});
