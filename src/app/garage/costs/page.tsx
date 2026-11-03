import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listCostItems, monthlyTotals } from "@/lib/costs";
import { modCategoryLabel } from "@/lib/mod-categories";
import { categoryLabel } from "@/lib/service-categories";
import { listServiceTypes } from "@/lib/service-types";
import { listVehicles, vehicleName } from "@/lib/vehicles";
import { CostChart } from "./cost-chart";

export const metadata: Metadata = { title: "Costs · Revlog" };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function CostsPage() {
  return (
    <>
      <h1 className="font-display text-4xl leading-tight font-semibold">Costs</h1>
      <p className="mt-2 text-steel">
        What you&apos;ve spent on service and installed mods, from your records.
      </p>
      <Suspense fallback={<CostsSkeleton />}>
        <CostDetails />
      </Suspense>
    </>
  );
}

async function CostDetails() {
  const user = await requireUser();
  const [items, cars, customTypes] = await Promise.all([
    listCostItems(user.id),
    listVehicles(user.id),
    listServiceTypes(user.id),
  ]);

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-graphite px-6 py-12 text-center">
        <p className="font-display text-2xl font-semibold">Nothing to add up yet.</p>
        <p className="mt-1 text-sm text-steel">
          Costs appear here as you log service and installed mods with a price.
        </p>
      </div>
    );
  }

  const today = new Date();
  const months = monthlyTotals(items, today);
  const sum = (list: typeof items) => list.reduce((n, i) => n + i.amount, 0);
  const total = sum(items);
  const yearAgo = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
  const lastYear = sum(items.filter((i) => i.on >= yearAgo));
  const serviceTotal = sum(items.filter((i) => i.kind === "service"));
  const modsTotal = total - serviceTotal;

  const perCar = cars
    .map((car) => {
      const own = items.filter((i) => i.vehicleId === car.id);
      const service = sum(own.filter((i) => i.kind === "service"));
      return { car, service, mods: sum(own) - service };
    })
    .filter((c) => c.service + c.mods > 0)
    .sort((a, b) => b.service + b.mods - (a.service + a.mods));

  const byCategory = new Map<string, number>();
  for (const i of items) {
    const label =
      i.kind === "service" ? categoryLabel(i.category, customTypes) : modCategoryLabel(i.category);
    const key = `${i.kind === "service" ? "Service" : "Mods"}: ${label}`;
    byCategory.set(key, (byCategory.get(key) ?? 0) + i.amount);
  }
  const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="All time" value={money.format(total)} />
        <Stat label="Last 12 months" value={money.format(lastYear)} />
        <Stat
          label="Service / mods"
          value={`${money.format(serviceTotal)} / ${money.format(modsTotal)}`}
          small
        />
      </div>

      <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
        <h2 className="font-display text-2xl leading-tight font-semibold">Spending by month</h2>
        <div className="mt-4">
          <CostChart months={months} />
        </div>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
          <h2 className="font-display text-2xl leading-tight font-semibold">By car</h2>
          <table className="mt-4 w-full text-left text-sm tabular-nums">
            <thead className="text-xs text-steel">
              <tr>
                <th className="py-1 font-normal">Car</th>
                <th className="py-1 text-right font-normal">Service</th>
                <th className="py-1 text-right font-normal">Mods</th>
                <th className="py-1 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {perCar.map(({ car, service, mods }) => (
                <tr key={car.id} className="border-t border-rule">
                  <td className="py-3">
                    <Link href={`/garage/${car.id}`} className="hover:text-redline">
                      {car.nickname ?? vehicleName(car)}
                    </Link>
                  </td>
                  <td className="py-3 text-right">{money.format(service)}</td>
                  <td className="py-3 text-right">{money.format(mods)}</td>
                  <td className="py-3 text-right font-medium">{money.format(service + mods)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
          <h2 className="font-display text-2xl leading-tight font-semibold">Biggest categories</h2>
          <ul className="mt-4">
            {topCategories.map(([label, amount]) => (
              <li
                key={label}
                className="flex items-baseline justify-between gap-3 border-t border-rule py-3 text-sm first:border-t-0"
              >
                <span>{label}</span>
                <span className="font-medium tabular-nums">{money.format(amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-graphite bg-panel p-5 sm:p-6">
      <p className="text-sm text-steel">{label}</p>
      <p className={`readout mt-2 leading-none ${small ? "text-2xl" : "text-4xl"}`}>{value}</p>
    </div>
  );
}

function CostsSkeleton() {
  return (
    <div className="mt-8 space-y-6" aria-busy="true" aria-label="Loading costs">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-72" />
    </div>
  );
}
