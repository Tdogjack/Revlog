import { buildMileageTimeline } from "@/lib/mileage-timeline";
import { dueLimits, type ReminderInput } from "@/lib/reminders";

type TimelineSource = {
  currentMileage: number;
  readings: { readOn: string; mileage: number }[];
  records: { id: string; title: string; servicedOn: string; mileage: number | null }[];
  mods: {
    id: string;
    part: string;
    brand: string | null;
    status: string;
    installedOn: string | null;
    installedMileage: number | null;
  }[];
  reminders: (ReminderInput & { id: string; task: string })[];
  // Where each entry opens, which differs between the website and the app.
  href: (kind: "service" | "mod" | "reminder", id: string) => string;
};

// A car's odometer history for the mileage graph, on the website and in the app.
export function carTimeline({
  currentMileage,
  readings,
  records,
  mods,
  reminders,
  href,
}: TimelineSource) {
  return buildMileageTimeline(
    [
      ...readings.map((r) => ({
        key: `reading-${r.readOn}`,
        kind: "reading" as const,
        date: r.readOn,
        mileage: r.mileage,
        label: "Odometer updated",
      })),
      ...records.map((r) => ({
        key: `service-${r.id}`,
        kind: "service" as const,
        date: r.servicedOn,
        mileage: r.mileage,
        label: r.title,
        href: href("service", r.id),
      })),
      ...mods.flatMap((m) =>
        m.status !== "planned" && m.installedOn
          ? [
              {
                key: `mod-${m.id}`,
                kind: "mod" as const,
                date: m.installedOn,
                mileage: m.installedMileage,
                label: m.brand ? `${m.brand} ${m.part}` : m.part,
                href: href("mod", m.id),
              },
            ]
          : [],
      ),
    ],
    currentMileage,
    undefined,
    reminders.map((r) => ({
      key: `due-${r.id}`,
      label: r.task,
      href: href("reminder", r.id),
      ...dueLimits(r),
    })),
  );
}
