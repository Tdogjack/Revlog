import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { getUser } from "@/lib/auth";
import { countShareableParts, MAX_POST_PHOTOS } from "@/lib/community";
import { listPhotosForVehicle } from "@/lib/gallery";
import { getMod } from "@/lib/mods";
import { signedPhotoUrls } from "@/lib/photos";
import { getProfile } from "@/lib/profiles";
import { getVehicle, listVehicles, vehicleName } from "@/lib/vehicles";
import { sharePost } from "../actions";
import { ShareForm } from "./share-form";

export const metadata: Metadata = { title: "Share to the community · Revlog" };

export default function NewPostPage({ searchParams }: PageProps<"/community/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/community" className="text-sm text-steel hover:text-chalk">
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
  const modId = typeof params.mod === "string" ? params.mod : null;
  const here = `/community/new${vehicleId ? `?vehicle=${vehicleId}${modId ? `&mod=${modId}` : ""}` : ""}`;

  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!(await getProfile(user.id))) redirect(`/username?next=${encodeURIComponent(here)}`);

  const car = vehicleId ? await getVehicle(user.id, vehicleId) : null;
  if (!car) return <ChooseCar userId={user.id} />;
  const mod = modId ? await getMod(user.id, car.id, modId) : null;

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
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">
        {mod ? "Share a new mod" : "Share your build"}
      </h1>
      <p className="mt-1 text-sm text-steel">
        {mod ? `${modName} on your ${name}` : name}. Posts are public, with your username.
      </p>
      <ShareForm
        action={sharePost}
        vehicleId={car.id}
        modId={mod?.id ?? null}
        defaultTitle={mod ? `Just installed: ${modName}` : `My ${vehicleName(car)} build`}
        photos={photos}
        maxPhotos={MAX_POST_PHOTOS}
        partCount={partCount}
        partScope={mod ? "this mod" : "your installed mods"}
      />
    </>
  );
}

async function ChooseCar({ userId }: { userId: string }) {
  const cars = await listVehicles(userId);
  const photoUrls = await signedPhotoUrls(cars.map((c) => c.photoPath));
  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold">Share your build</h1>
      <p className="mt-1 text-sm text-steel">
        Pick a car. To share a single mod, use Share next to it on the car&apos;s page.
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
                className="flex items-center gap-4 rounded-xl border border-graphite bg-panel p-4 hover:border-steel"
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
