import Link from "next/link";
import { Suspense } from "react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { PhotoStrip } from "@/components/photo-strip";
import { isEmailVerified } from "@/lib/email-verification";
import { PHOTO_LIMITS } from "@/lib/gallery";
import { listMods } from "@/lib/mods";
import { listServiceRecords } from "@/lib/service-records";
import {
  formatDate,
  headingClass,
  loadCar,
  loadGallery,
  panelClass,
  TabHead,
  TabSkeleton,
} from "../shared";

// Every photo of the car: the build gallery first, then the ones attached to
// mods and service records, each under the item it belongs to.
export default function PhotosPage({ params }: PageProps<"/garage/[id]/photos">) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <Photos params={params} />
    </Suspense>
  );
}

async function Photos({ params }: Pick<PageProps<"/garage/[id]/photos">, "params">) {
  const { user, car } = await loadCar(params);
  const [pickPhotos, mods, records, canUpload] = await Promise.all([
    loadGallery(user.id, car.id),
    listMods(user.id, car.id),
    listServiceRecords(user.id, car.id),
    isEmailVerified(user.id),
  ]);
  const base = `/garage/${car.id}`;
  const build = pickPhotos((p) => !p.modId && !p.serviceRecordId);
  const modPhotos = mods
    .map((m) => ({ item: m, photos: pickPhotos((p) => p.modId === m.id) }))
    .filter((g) => g.photos.length > 0);
  const recordPhotos = records
    .map((r) => ({ item: r, photos: pickPhotos((p) => p.serviceRecordId === r.id) }))
    .filter((g) => g.photos.length > 0);
  const total =
    build.length +
    modPhotos.reduce((n, g) => n + g.photos.length, 0) +
    recordPhotos.reduce((n, g) => n + g.photos.length, 0);

  return (
    <>
      <TabHead
        title="Photos"
        summary={
          total === 0
            ? "Shots of the car, and the receipts and parts you attach to records."
            : `${total} ${total === 1 ? "photo" : "photos"}`
        }
      />

      <section className={`${panelClass} mt-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className={headingClass}>Build</h3>
          <span className="text-sm text-steel">
            {build.length} of {PHOTO_LIMITS.build}
          </span>
        </div>
        <div className="mt-4">
          <PhotoStrip
            vehicleId={car.id}
            kind="build"
            photos={build}
            max={PHOTO_LIMITS.build}
            addLabel="Add build photos"
            size="large"
            canAdd={canUpload}
          />
          {!canUpload && (
            <div className="mt-2">
              <ConfirmEmailNote />
            </div>
          )}
        </div>
      </section>

      {modPhotos.length > 0 && (
        <section className={`${panelClass} mt-6`}>
          <h3 className={headingClass}>From mods</h3>
          <ul className="mt-2 divide-y divide-rule">
            {modPhotos.map(({ item: m, photos }) => (
              <li key={m.id} className="py-4">
                <Link
                  href={`${base}/mods/${m.id}/edit`}
                  className="font-semibold hover:text-redline"
                >
                  {m.brand ? `${m.brand} ${m.part}` : m.part}
                </Link>
                {m.installedOn && (
                  <span className="ml-2 text-sm text-steel">{formatDate(m.installedOn)}</span>
                )}
                <PhotoStrip
                  vehicleId={car.id}
                  kind="mod"
                  targetId={m.id}
                  photos={photos}
                  max={PHOTO_LIMITS.mod}
                  addLabel="Add mod photos"
                  canAdd={false}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recordPhotos.length > 0 && (
        <section className={`${panelClass} mt-6`}>
          <h3 className={headingClass}>From service records</h3>
          <ul className="mt-2 divide-y divide-rule">
            {recordPhotos.map(({ item: r, photos }) => (
              <li key={r.id} className="py-4">
                <Link
                  href={`${base}/service/${r.id}/edit`}
                  className="font-semibold hover:text-redline"
                >
                  {r.title}
                </Link>
                <span className="ml-2 text-sm text-steel">{formatDate(r.servicedOn)}</span>
                <PhotoStrip
                  vehicleId={car.id}
                  kind="record"
                  targetId={r.id}
                  photos={photos}
                  max={PHOTO_LIMITS.record}
                  addLabel="Add receipt photos"
                  canAdd={false}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
