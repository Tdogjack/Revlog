import Link from "next/link";
import { cookies } from "next/headers";
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
import { parseRowSize, rowSizeCookie, type RowList, type RowSize } from "@/lib/row-size";
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
export const summaryClass =
  "cursor-pointer list-none [&::-webkit-details-marker]:hidden";

// Sections are quiet L1 panels; rows inside are split by hairlines.
export const panelClass =
  "@container rounded-2xl border border-graphite bg-panel p-4 sm:p-6";
export const headingClass = "font-display text-2xl font-semibold";
export const dateClass =
  "shrink-0 pt-0.5 text-sm text-steel tabular-nums @md:w-24";

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
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}

// A one-line row: the same card, drawn tighter.
export const smallCardClass =
  "rounded-lg border border-graphite bg-carbon/50 px-3 py-2 transition-colors hover:bg-graphite/30";

// The row size the user picked for one of the car lists.
export async function getRowSize(list: RowList): Promise<RowSize> {
  return parseRowSize((await cookies()).get(rowSizeCookie(list))?.value);
}

// The open/close mark at the end of a one-line row.
export function RowChevron() {
  return (
    <ChevronDown
      className="h-4 w-4 shrink-0 text-steel transition-transform group-open:rotate-180"
      aria-hidden
    />
  );
}

// A number on a one-line row, mileage or money, in the readout face.
export function Readout({
  children,
  unit,
}: {
  children: React.ReactNode;
  unit?: string;
}) {
  return (
    <span className="readout shrink-0 text-sm text-chalk">
      {children}
      {unit && (
        <span className="ml-1 font-sans text-xs font-normal text-steel">
          {unit}
        </span>
      )}
    </span>
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
  const [photos, thumbs] = await Promise.all([
    signedPhotoUrls(paths),
    signedThumbUrls(paths),
  ]);
  return (match: (p: (typeof gallery)[number]) => boolean): StripPhoto[] =>
    gallery.filter(match).flatMap((p) => {
      const url = photos.get(p.storagePath);
      return url
        ? [{ id: p.id, url, thumb: thumbs.get(p.storagePath) ?? url }]
        : [];
    });
}

export type PickPhotos = Awaited<ReturnType<typeof loadGallery>>;
export type ServiceRecord = Awaited<
  ReturnType<typeof listServiceRecords>
>[number];
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
      <ChevronDown
        className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
        aria-hidden
      />
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
  size = "medium",
}: {
  vehicleId: string;
  record: ServiceRecord;
  customTypes: CustomTypes;
  parts: Part[];
  photos: StripPhoto[];
  size?: RowSize;
}) {
  if (size === "small") {
    return (
      <li className={smallCardClass}>
        <details className="group">
          <summary
            className={`${summaryClass} flex min-h-7 items-center gap-3`}
          >
            <span className="w-[5.5rem] shrink-0 text-sm text-steel tabular-nums">
              {formatDate(r.servicedOn)}
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {r.title}
            </span>
            <span className="hidden max-w-40 shrink-0 truncate text-sm text-steel @2xl:inline">
              {categoryLabel(r.category, customTypes)}
            </span>
            {r.shop && (
              <span className="hidden max-w-32 shrink-0 truncate text-sm text-steel @3xl:inline">
                {r.shop}
              </span>
            )}
            {r.mileage != null && (
              <span className="hidden @md:inline">
                <Readout unit="mi">{r.mileage.toLocaleString("en-US")}</Readout>
              </span>
            )}
            {r.cost && <Readout>{money.format(Number(r.cost))}</Readout>}
            <RowChevron />
          </summary>
          <ServiceDetails
            vehicleId={vehicleId}
            record={r}
            parts={parts}
            photos={photos}
          />
        </details>
      </li>
    );
  }
  return (
    <li className={`${cardClass} flex flex-col gap-1 @md:flex-row @md:gap-4`}>
      <div className={dateClass}>{formatDate(r.servicedOn)}</div>
      <details className="group min-w-0 flex-1">
        <summary className={summaryClass}>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-steel">
              {categoryLabel(r.category, customTypes)}
            </p>
          </div>
          <RecordStats miles={r.mileage} cost={r.cost} extra={[r.shop]} />
          <DetailsHint
            notes={!!r.notes}
            parts={parts.length}
            photos={photos.length}
          />
        </summary>
        <ServiceDetails
          vehicleId={vehicleId}
          record={r}
          parts={parts}
          photos={photos}
        />
      </details>
    </li>
  );
}

// What opens under a service row: notes, parts, receipts, and its buttons.
function ServiceDetails({
  vehicleId,
  record: r,
  parts,
  photos,
}: {
  vehicleId: string;
  record: ServiceRecord;
  parts: Part[];
  photos: StripPhoto[];
}) {
  return (
    <>
      {r.notes && (
        <p className="mt-2 max-w-prose whitespace-pre-line text-sm">
          {r.notes}
        </p>
      )}
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
    </>
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
