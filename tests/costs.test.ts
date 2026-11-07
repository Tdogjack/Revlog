import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

const today = new Date("2026-11-15T00:00:00Z");
const cars = [
  { id: "a", name: "Civic" },
  { id: "b", name: "Tacoma" },
  { id: "c", name: "Unused" },
];
const item = (vehicleId: string, kind: "service" | "mod", on: string, amount: number) => ({
  vehicleId,
  kind,
  on,
  amount,
  category: kind === "service" ? "oil" : "engine",
});

describe("cost totals", () => {
  const items = [
    item("a", "service", "2026-10-01", 100),
    item("a", "mod", "2026-11-01", 300),
    item("b", "service", "2024-01-01", 1000),
  ];

  it("splits service and mods and keeps the last 12 months apart", async () => {
    const { summarizeCosts } = await import("@/lib/costs");
    const s = summarizeCosts(items, cars, [], today);
    expect(s).toMatchObject({ total: 1400, lastYear: 400, serviceTotal: 1100, modsTotal: 300 });
  });

  it("ranks cars by spend and leaves out cars with none", async () => {
    const { summarizeCosts } = await import("@/lib/costs");
    const s = summarizeCosts(items, cars, [], today);
    expect(s.perCar.map((c) => c.name)).toEqual(["Tacoma", "Civic"]);
    expect(s.perCar[1]).toMatchObject({ service: 100, mods: 300 });
  });

  it("ends the months on the current one", async () => {
    const { summarizeCosts } = await import("@/lib/costs");
    const { months } = summarizeCosts(items, cars, [], today);
    expect(months).toHaveLength(12);
    expect(months.at(-1)).toMatchObject({ month: "2026-11", mods: 300, service: 0 });
  });
});
