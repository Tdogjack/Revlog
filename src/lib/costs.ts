import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { mods, serviceRecords } from "@/db/schema";

export type CostItem = {
  vehicleId: string;
  kind: "service" | "mod";
  on: string; // YYYY-MM-DD
  amount: number;
  category: string | null;
};

// Every service record and installed mod with a cost, as one list.
export async function listCostItems(userId: string): Promise<CostItem[]> {
  const [records, installed] = await Promise.all([
    db
      .select({
        vehicleId: serviceRecords.vehicleId,
        on: serviceRecords.servicedOn,
        cost: serviceRecords.cost,
        category: serviceRecords.category,
      })
      .from(serviceRecords)
      .where(and(eq(serviceRecords.userId, userId), isNotNull(serviceRecords.cost))),
    db
      .select({
        vehicleId: mods.vehicleId,
        installedOn: mods.installedOn,
        createdAt: mods.createdAt,
        cost: mods.cost,
        category: mods.category,
      })
      .from(mods)
      .where(and(eq(mods.userId, userId), eq(mods.status, "installed"), isNotNull(mods.cost))),
  ]);
  return [
    ...records.map((r) => ({
      vehicleId: r.vehicleId,
      kind: "service" as const,
      on: r.on,
      amount: Number(r.cost),
      category: r.category,
    })),
    // Mods without an install date count from when they were logged.
    ...installed.map((m) => ({
      vehicleId: m.vehicleId,
      kind: "mod" as const,
      on: m.installedOn ?? m.createdAt.toISOString().slice(0, 10),
      amount: Number(m.cost),
      category: m.category,
    })),
  ];
}

export type MonthTotal = { month: string; label: string; service: number; mods: number };

// The last `count` months ending with the current one, oldest first.
export function monthlyTotals(items: CostItem[], today: Date, count = 12): MonthTotal[] {
  const months: MonthTotal[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const month = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    months.push({ month, label, service: 0, mods: 0 });
  }
  for (const item of items) {
    const bucket = months.find((m) => m.month === item.on.slice(0, 7));
    if (!bucket) continue;
    if (item.kind === "service") bucket.service += item.amount;
    else bucket.mods += item.amount;
  }
  return months;
}
