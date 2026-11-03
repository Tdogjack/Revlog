import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { getUser } from "@/lib/auth";
import { countShareableParts, getBuildPostId, getPost, MAX_POST_PHOTOS } from "@/lib/community";
import { listPhotosForVehicle } from "@/lib/gallery";
import { getMod } from "@/lib/mods";
import { signedPhotoUrls } from "@/lib/photos";
import { isEmailVerified } from "@/lib/email-verification";
import { getProfile } from "@/lib/profiles";
import { getVehicle, listVehicles, vehicleName } from "@/lib/vehicles";
import { saveBuild, sharePost } from "../actions";
import { ShareForm } from "./share-form";

export const metadata: Metadata = { title: "Share to the community · Revlog" };

export default function NewPostPage({ searchParams }: PageProps<"/community/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/community" className="inline-flex min-h-9 items-center text-sm text-steel hover:text-chalk">
        ← Back to community
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-steel">Loading…</p>}>
        <NewPost searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewPost({ searchParams }: Pick<PageProps<"/community/new">, "searchParams">) {
  const params = await searchParams;
  const vehicleId = typeof params.vehicle === "string" ? params.vehicle : null;
  const isBuild = params.build === "1";
  const modId = !isBuild && typeof params.mod === "string" ? params.mod : null;
  const query = new URLSearchParams();
  if (vehicleId) query.set("vehicle", vehicleId);
  if (modId) query.set("mod", modId);
  if (isBuild) query.set("build", "1");
  const here = `/community/new${query.size ? `?${query}` : ""}`;

  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!(await getProfile(user.id))) redirect(`/username?next=${encodeURIComponent(here)}`);

  const car = vehicleId ? await getVehicle(user.id, vehicleId) : null;
  const canUpload = await isEmailVerified(user.id);
  if (!car) return <ChooseCar userId={user.id} />;
  const mod = modId ? await getMod(user.id, car.id, modId) : null;
  const buildPostId = await getBuildPostId(user.id, car.id);
  const build = isBuild && buildPostId ? await getPost(buildPostId) : null;

  // A mod post offers that mod's photos first, then the build library.
  const gallery = (await listPhotosForVehicle(user.id, car.id)).filter(
    (p) => !p.serviceRecordId && (p.modId === null || p.modId === mod?.id || !mod),
  );
  const ordered = mod
    ? [...gallery.filter((p) => p.modId === mod.id), ...gallery.filter((p) => p.modId !== mod.id)]
    : gallery;
  const [urls, partCount] = await Promise.all([
    signedPhotoUrls(ordered.map((p) => p.storagePath)),
    countShareableParts(user.id, car.id, mod?.id ?? null),
  ]);
  const photos = ordered.flatMap((p) => {
    const url = urls.get(p.storagePath);
    return url ? [{ id: p.id, url, fromMod: p.modId === mod?.id && !!mod }] : [];
  });

  const name = car.nickname ?? vehicleName(car);
  const modName = mod ? [mod.brand, mod.part].filter(Boolean).join(" ") : null;

  if (isBuild) {
    return (
      <>
        <h1 className="mt-4 font-display text-4xl leading-none font-semibold">
          {build ? "Update public build" : "Post public build"}
        </h1>
        <p className="mt-2 text-steel">
          {name}.{" "}
          {build
            ? "Changes show on your build post right away."
            : "Each car gets one public build that you keep up to date from your garage."}
        </p>
        <ShareForm
          action={saveBuild}
          vehicleId={car.id}
          modId={null}
          defaultTitle={build?.title ?? `My ${vehicleName(car)} build`}
          defaultBody={build?.body ?? undefined}
          defaultShowParts={build?.showParts}
          photos={photos}
          currentPhotos={build?.photos}
          maxPhotos={MAX_POST_PHOTOS}
          partCount={partCount}
          partScope="your installed mods"
          defaultTag="build"
          showTags={false}
          canUpload={canUpload}
          submitLabel={build ? "Update build" : "Post build"}
        />
      </>
    );
  }

  return (
    <>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">
        {mod ? "Share a new mod" : "Share to the community"}
      </h1>
      <p className="mt-2 text-steel">
        {mod ? `${modName} on your ${name}` : name}. Posts are public, with your username.
      </p>
      {!mod && (
        <p className="mt-3 rounded-md border border-graphite px-3 py-2 text-sm text-steel">
          Showing off the whole car?{" "}
          <Link
            href={`/community/new?vehicle=${car.id}&build=1`}
            className="font-medium text-chalk hover:text-redline"
          >
            {buildPostId ? "Update your public build" : "Post your public build"}
          </Link>{" "}
          instead.
        </p>
      )}
      <ShareForm
        action={sharePost}
        vehicleId={car.id}
        modId={mod?.id ?? null}
        defaultTitle={mod ? `Just installed: ${modName}` : ""}
        photos={photos}
        maxPhotos={MAX_POST_PHOTOS}
        partCount={partCount}
        partScope={mod ? "this mod" : "your installed mods"}
        defaultTag={mod ? "mod" : "progress"}
        canUpload={canUpload}
      />
    </>
  );
}

async function ChooseCar({ userId }: { userId: string }) {
  const cars = await listVehicles(userId);
  const photoUrls = await signedPhotoUrls(cars.map((c) => c.photoPath));
  return (
    <>
      <h1 className="mt-4 font-display text-4xl leading-none font-semibold">Share to the community</h1>
      <p className="mt-2 text-steel">
        Pick a car. Public builds and single mods are shared from the car&apos;s page.
      </p>
      {cars.length === 0 ? (
        <p className="mt-6 text-sm text-steel">
          Add a car to your{" "}
          <Link href="/garage/new" className="text-chalk hover:text-redline">
            garage
          </Link>{" "}
          first.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {cars.map((c) => (
            <li key={c.id}>
              <Link
                href={`/community/new?vehicle=${c.id}`}
                className="flex items-center gap-4 rounded-lg border border-graphite bg-panel p-3 transition-colors hover:border-steel"
              >
                <VehiclePhoto
                  src={c.photoPath ? photoUrls.get(c.photoPath) : null}
                  alt={vehicleName(c)}
                />
                <span>
                  <span className="block font-medium">{c.nickname ?? vehicleName(c)}</span>
                  {c.nickname && <span className="block text-sm text-steel">{vehicleName(c)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
