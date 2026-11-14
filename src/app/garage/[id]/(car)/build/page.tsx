import Link from "next/link";
import { Suspense } from "react";
import { Plus, Share2, Sparkles } from "lucide-react";
import { ConfirmEmailNote } from "@/components/confirm-email-note";
import { PhotoStrip } from "@/components/photo-strip";
import { cardClass, RecordStats } from "@/components/record-stats";
import { DeletePostButton } from "@/app/community/delete-post-button";
import { getBuildPostId } from "@/lib/community";
import { isEmailVerified } from "@/lib/email-verification";
import { PHOTO_LIMITS } from "@/lib/gallery";
import { modCategoryLabel } from "@/lib/mod-categories";
import { listMods } from "@/lib/mods";
import { listPartsForVehicle } from "@/lib/parts";
import { ModControls } from "../../mod-controls";
import { PartsList } from "../../parts-list";
import {
  DetailsHint,
  formatDate,
  loadCar,
  loadGallery,
  money,
  panelClass,
  summaryClass,
  sumCost,
  TabHead,
  TabSkeleton,
  type Part,
  type PickPhotos,
} from "../shared";

// The car's build: its photos, then every mod by where it stands.
export default function BuildPage({ params }: PageProps<"/garage/[id]/build">) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <Build params={params} />
    </Suspense>
  );
}

type Mod = Awaited<ReturnType<typeof listMods>>[number];

const GROUPS = [
  { status: "installed", title: "Installed", empty: "Nothing installed yet." },
  { status: "planned", title: "Planned", empty: "No plans yet. Add the next part you want." },
  { status: "removed", title: "Removed", empty: null },
] as const;

async function Build({ params }: Pick<PageProps<"/garage/[id]/build">, "params">) {
  const { user, car } = await loadCar(params);
  const [mods, parts, pickPhotos, buildPostId, canUpload] = await Promise.all([
    listMods(user.id, car.id),
    listPartsForVehicle(user.id, car.id),
    loadGallery(user.id, car.id),
    getBuildPostId(user.id, car.id),
    isEmailVerified(user.id),
  ]);
  const base = `/garage/${car.id}`;
  const installed = mods.filter((m) => m.status === "installed");
  const planned = mods.filter((m) => m.status === "planned");

  const summary =
    mods.length === 0
      ? "Every part you've added, and the ones you're planning."
      : [
          `${installed.length} installed`,
          sumCost(installed) > 0 && `${money.format(sumCost(installed))} invested`,
          sumCost(planned) > 0 && `${money.format(sumCost(planned))} planned`,
        ]
          .filter(Boolean)
          .join(", ");

  return (
    <>
      <TabHead title="Build" summary={summary}>
        <Link href={`/community/new?vehicle=${car.id}&build=1`} className="btn">
          <Share2 className="h-4 w-4" aria-hidden />
          {buildPostId ? "Update public build" : "Post public build"}
        </Link>
        <Link href={`${base}/mods/new`} className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          Add mod
        </Link>
      </TabHead>

      {buildPostId && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-graphite bg-panel px-4 py-3 text-sm text-steel">
          <span className="flex items-center gap-2 text-chalk">
            <span className="h-1.5 w-1.5 rounded-full bg-done" aria-hidden />
            Your public build is live.
          </span>
          <Link
            href={`/community/${buildPostId}`}
            className="underline-offset-4 hover:text-chalk hover:underline"
          >
            View post
          </Link>
          <DeletePostButton
            postId={buildPostId}
            next={`${base}/build`}
            label="Take down"
            confirmText="Take down your public build? The post and its shared photos are removed. You can post it again any time."
          />
        </div>
      )}

      <section className={`${panelClass} mt-6`}>
        <h3 className="font-display text-xl font-semibold">Photos</h3>
        <div className="mt-4">
          <PhotoStrip
            vehicleId={car.id}
            kind="build"
            photos={pickPhotos((p) => !p.modId && !p.serviceRecordId)}
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

      {mods.length === 0 ? (
        <section className={`${panelClass} mt-6 py-10 text-center`}>
          <Sparkles className="mx-auto h-8 w-8 text-steel" aria-hidden />
          <h3 className="mt-4 font-display text-2xl font-semibold">No mods logged yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-steel">
            Add parts you&apos;ve installed with what they cost, or plan your next one.
          </p>
          <Link href={`${base}/mods/new`} className="btn btn-primary mt-6">
            Add mod
          </Link>
        </section>
      ) : (
        GROUPS.map((group) => {
          const list = mods.filter((m) => m.status === group.status);
          if (list.length === 0 && !group.empty) return null;
          const cost = sumCost(list);
          return (
            <section key={group.status} className={`${panelClass} mt-6`}>
              <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex items-baseline gap-2 font-display text-xl font-semibold">
                  {group.title}
                  <span className="font-sans text-sm font-normal text-steel">{list.length}</span>
                </span>
                {cost > 0 && <span className="text-sm text-steel">{money.format(cost)}</span>}
              </h3>
              {list.length === 0 ? (
                <p className="mt-3 text-sm text-steel">{group.empty}</p>
              ) : (
                <ul className="mt-4 grid gap-2 @3xl:grid-cols-2">
                  {list.map((m) => (
                    <ModCard
                      key={m.id}
                      mod={m}
                      vehicleId={car.id}
                      parts={parts.filter((p) => p.modId === m.id)}
                      pickPhotos={pickPhotos}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </>
  );
}

function ModCard({
  mod: m,
  vehicleId,
  parts,
  pickPhotos,
}: {
  mod: Mod;
  vehicleId: string;
  parts: Part[];
  pickPhotos: PickPhotos;
}) {
  const photos = pickPhotos((p) => p.modId === m.id);
  const summary = (
    <>
      <p className={`font-semibold ${m.status === "removed" ? "text-steel line-through" : ""}`}>
        {m.brand ? `${m.brand} ${m.part}` : m.part}
      </p>
      <RecordStats
        miles={m.installedMileage}
        cost={m.cost}
        extra={[modCategoryLabel(m.category), m.installedOn && formatDate(m.installedOn)]}
      />
    </>
  );
  return (
    <li className={`${cardClass} flex flex-col gap-2 @md:flex-row @md:gap-4`}>
      {m.notes || parts.length > 0 || photos.length > 0 ? (
        <details className="group min-w-0 flex-1">
          <summary className={summaryClass}>
            {summary}
            <DetailsHint notes={!!m.notes} parts={parts.length} photos={photos.length} />
          </summary>
          {m.notes && <p className="mt-2 max-w-prose whitespace-pre-line text-sm">{m.notes}</p>}
          <PartsList
            vehicleId={vehicleId}
            parts={parts}
            label={m.status === "planned" ? "Parts wanted" : "Parts used"}
          />
          {photos.length > 0 && (
            <PhotoStrip
              vehicleId={vehicleId}
              kind="mod"
              targetId={m.id}
              photos={photos}
              max={PHOTO_LIMITS.mod}
              addLabel="Add mod photos"
              canAdd={false}
            />
          )}
        </details>
      ) : (
        <div className="min-w-0 flex-1">{summary}</div>
      )}
      <div className="-ml-1 flex items-center gap-1 @md:ml-0 @md:flex-col @md:items-end">
        <ModControls vehicleId={vehicleId} modId={m.id} status={m.status} />
        {m.status === "installed" && (
          <Link
            href={`/community/new?vehicle=${vehicleId}&mod=${m.id}`}
            className="flex min-h-9 items-center gap-1 px-1 text-xs text-steel hover:text-chalk"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Share
          </Link>
        )}
      </div>
    </li>
  );
}
