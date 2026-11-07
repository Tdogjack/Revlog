import { describe, expect, it } from "vitest";
import { carTimeline } from "@/lib/car-timeline";

const base = {
  currentMileage: 12000,
  readings: [{ readOn: "2026-01-01", mileage: 10000 }],
  records: [{ id: "rec", title: "Oil change", servicedOn: "2026-03-01", mileage: 11000 }],
  mods: [
    {
      id: "on",
      part: "Intake",
      brand: "K&N",
      status: "installed",
      installedOn: "2026-02-01",
      installedMileage: null,
    },
    {
      id: "later",
      part: "Coilovers",
      brand: null,
      status: "planned",
      installedOn: null,
      installedMileage: null,
    },
  ],
  reminders: [],
  href: (kind: string, id: string) => `/${kind}/${id}`,
};

describe("a car's mileage timeline", () => {
  it("links each entry where the caller says", () => {
    const events = carTimeline(base)?.events ?? [];
    expect(events.find((e) => e.kind === "service")?.href).toBe("/service/rec");
    expect(events.find((e) => e.kind === "mod")?.href).toBe("/mod/on");
  });

  it("names a mod with its brand and leaves out planned ones", () => {
    const mods = carTimeline(base)?.events.filter((e) => e.kind === "mod") ?? [];
    expect(mods.map((m) => m.label)).toEqual(["K&N Intake"]);
  });

  it("places an entry with no mileage on the line and marks it estimated", () => {
    const mod = carTimeline(base)?.events.find((e) => e.kind === "mod");
    expect(mod?.estimated).toBe(true);
    expect(mod?.miles).toBeGreaterThan(10000);
    expect(mod?.miles).toBeLessThan(11000);
  });

  it("has nothing to draw with a single reading", () => {
    const timeline = carTimeline({
      ...base,
      currentMileage: 10000,
      records: [],
      mods: [],
    });
    expect(timeline).toBeNull();
  });
});
