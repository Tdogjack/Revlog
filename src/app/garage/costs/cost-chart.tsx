"use client";

import { useState } from "react";
import type { MonthTotal } from "@/lib/costs";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Stacked monthly bars: service (red) under mods (blue), with a hover readout.
export function CostChart({ months }: { months: MonthTotal[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.service + m.mods), 1);
  const shown = active === null ? null : months[active];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-steel">
        <div className="flex items-center gap-4" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-service" />
            Service
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-chart-mods" />
            Mods
          </span>
        </div>
        <p className="min-h-4 text-chalk" aria-live="polite">
          {shown
            ? `${shown.label} ${shown.month.slice(0, 4)}: ${money.format(shown.service)} service · ${money.format(shown.mods)} mods`
            : "Hover a month for details"}
        </p>
      </div>

      <div
        className="mt-4 flex h-48 items-end gap-1.5 border-b border-graphite sm:gap-2"
        onMouseLeave={() => setActive(null)}
      >
        {months.map((m, i) => {
          const total = m.service + m.mods;
          return (
            <button
              key={m.month}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${m.label} ${m.month.slice(0, 4)}: ${money.format(m.service)} service, ${money.format(m.mods)} mods`}
              className={`flex h-full flex-1 flex-col justify-end rounded-t outline-none ${active === i ? "bg-graphite/50" : ""}`}
            >
              {total > 0 && (
                <span
                  className="flex w-full flex-col gap-[2px] overflow-hidden rounded-t"
                  style={{ height: `${(total / max) * 100}%` }}
                >
                  {m.mods > 0 && (
                    <span className="w-full bg-chart-mods" style={{ flexGrow: m.mods }} />
                  )}
                  {m.service > 0 && (
                    <span className="w-full bg-chart-service" style={{ flexGrow: m.service }} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-center text-[10px] text-steel sm:gap-2">
        {months.map((m) => (
          <span key={m.month} className="flex-1">
            {m.label}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs text-steel hover:text-chalk">
          Show as a table
        </summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-steel">
            <tr>
              <th className="py-1 font-normal">Month</th>
              <th className="py-1 text-right font-normal">Service</th>
              <th className="py-1 text-right font-normal">Mods</th>
              <th className="py-1 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month} className="border-t border-graphite">
                <td className="py-1">
                  {m.label} {m.month.slice(0, 4)}
                </td>
                <td className="py-1 text-right">{money.format(m.service)}</td>
                <td className="py-1 text-right">{money.format(m.mods)}</td>
                <td className="py-1 text-right">{money.format(m.service + m.mods)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
