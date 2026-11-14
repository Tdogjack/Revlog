import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, Copy, Pencil } from "lucide-react";
import { PhotoStrip, type StripPhoto } from "@/components/photo-strip";
import { cardClass, RecordStats } from "@/components/record-stats";
import { requireUser } from "@/lib/auth";
import { listPhotosForVehicle, PHOTO_LIMITS } from "@/lib/gallery";
import type { listPartsForVehicle } from "@/lib/parts";
import { signedPhotoUrls, signedThumbUrls } from "@/lib/photos";
import { categoryLabel } from "@/lib/service-categories";
import type { listServiceRecords } from "@/lib/service-records";
import type { listServiceTypes } from "@/lib/service-types";
import { getVehicle } from "@/lib/vehicles";
import { DeleteRecordButton } from "../delete-record-button";
import { PartsList } from "../parts-list";

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// Stored as YYYY-MM-DD; format in UTC so the day never shifts.
export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  });
}

export const sumCost = (items: { cost: string | null }[]) =>
  items.reduce((sum, i) => sum + (i.cost ? Number(i.cost) : 0), 0);

// Records and mods show one summary line; notes, parts, and photos open on click.
export const summaryClass = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";

// Sections are quiet L1 panels; rows inside are split by hairlines.
export const panelClass = "@container rounded-2xl border border-graphite bg-panel p-4 sm:p-6";
export const headingClass = "font-display text-2xl font-semibold";
export const dateClass = "shrink-0 pt-0.5 text-sm text-steel tabular-nums @md:w-24";

// The top of each car tab: what it holds on the left, its actions on the right.
export function TabHead({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h2 className="font-display text-3xl font-semibold">{title}</h2>
        {summary && <p className="mt-1 text-steel">{summary}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// The signed-in user's car for this URL, or a 404.
export async function loadCar(params: Promise<{ id: string }>) {
  const { id } = await params;
  const user = await requireUser();
  const car = await getVehicle(user.id, id);
  if (!car) notFound();
  return { user, car };
}

// The car's gallery with signed links, and a picker for the photos that
// belong to one record, mod, or the build. Grids load the small copy; the
// full photo only opens in the viewer.
export async function loadGallery(userId: string, vehicleId: string) {
  const gallery = await listPhotosForVehicle(userId, vehicleId);
  const paths = gallery.map((p) => p.storagePath);
  const [photos, thumbs] = await Promise.all([signedPhotoUrls(paths), signedThumbUrls(paths)]);
  return (match: (p: (typeof gallery)[number]) => boolean): StripPhoto[] =>
    gallery.filter(match).flatMap((p) => {
      const url = photos.get(p.storagePath);
      return url ? [{ id: p.id, url, thumb: thumbs.get(p.storagePath) ?? url }] : [];
    });
}

export type PickPhotos = Awaited<ReturnType<typeof loadGallery>>;
export type ServiceRecord = Awaited<ReturnType<typeof listServiceRecords>>[number];
export type Part = Awaited<ReturnType<typeof listPartsForVehicle>>[number];
export type CustomTypes = Awaited<ReturnType<typeof listServiceTypes>>;

// Records always open, since their edit and copy buttons live inside; without
// notes, parts, or photos the hint just says so.
export function DetailsHint({
  notes,
  parts,
  photos,
}: {
  notes: boolean;
  parts: number;
  photos: number;
}) {
  const bits = [
    notes && "notes",
    parts > 0 && `${parts} ${parts === 1 ? "part" : "parts"}`,
    photos > 0 && `${photos} ${photos === 1 ? "photo" : "photos"}`,
  ].filter(Boolean);
  return (
    <p className="mt-1.5 flex w-fit items-center gap-1 text-xs text-steel hover:text-chalk">
      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
      {bits.length > 0 ? bits.join(" · ") : "Options"}
    </p>
  );
}

// One service record: date, title, and numbers, opening to notes, parts,
// receipts, and its edit buttons.
export function ServiceRow({
  vehicleId,
  record: r,
  customTypes,
  parts,
  photos,
}: {
  vehicleId: string;
  record: ServiceRecord;
  customTypes: CustomTypes;
  parts: Part[];
  photos: StripPhoto[];
}) {
  return (
    <li className={`${cardClass} flex flex-col gap-1 @md:flex-row @md:gap-4`}>
      <div className={dateClass}>{formatDate(r.servicedOn)}</div>
      <details className="group min-w-0 flex-1">
        <summary className={summaryClass}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-steel">{categoryLabel(r.category, customTypes)}</p>
          </div>
          <RecordStats miles={r.mileage} cost={r.cost} extra={[r.shop]} />
          <DetailsHint notes={!!r.notes} parts={parts.length} photos={photos.length} />
        </summary>
        {r.notes && <p className="mt-2 max-w-prose whitespace-pre-line text-sm">{r.notes}</p>}
        <PartsList vehicleId={vehicleId} parts={parts} label="Parts used" />
        {photos.length > 0 && (
          <PhotoStrip
            vehicleId={vehicleId}
            kind="record"
            targetId={r.id}
            photos={photos}
            max={PHOTO_LIMITS.record}
            addLabel="Add receipt photos"
            canAdd={false}
          />
        )}
        <div className="mt-2 -ml-2 flex items-center">
          <Link
            href={`/garage/${vehicleId}/service/new?copy=${r.id}`}
            aria-label="Copy record"
            title="Log again (copies parts too)"
            className="icon-btn"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={`/garage/${vehicleId}/service/${r.id}/edit`}
            aria-label="Edit record"
            title="Edit record"
            className="icon-btn"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Link>
          <DeleteRecordButton vehicleId={vehicleId} recordId={r.id} />
        </div>
      </details>
    </li>
  );
}

// Stands in for a tab while it loads: its heading row and one big panel.
export function TabSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex items-end justify-between gap-6">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-10 w-48" />
      </div>
      <div className="skeleton mt-6 h-96" />
    </div>
  );
}
