"use client";

import { useRef, useState } from "react";
import {
  CommentsPreview,
  CostsPreview,
  EmailPreview,
  GraphPreview,
  ModsPreview,
  OrderScanPreview,
  PdfPreview,
  PostPreview,
  PricePreview,
  PrivatePreview,
  ScanPreview,
  VinPreview,
} from "./previews";

type Feature = { id: string; title: string; body: string; Preview: () => React.ReactNode };
type Group = { id: string; title: string; accent: string; features: Feature[] };

// Grouped the way a driver thinks about it. Each group has its own accent
// from the chart palette, so the three read as different jobs.
const GROUPS: Group[] = [
  {
    id: "run",
    title: "Keep it running",
    accent: "bg-chart-service",
    features: [
      { id: "scan", title: "Receipt scanning", body: "Snap the shop receipt. The date, mileage, cost, shop, and parts fill in for you to check.", Preview: ScanPreview },
      { id: "remind", title: "Reminders and emails", body: "By miles, months, or whichever comes first. A heads-up before it's due, and a nudge while it's overdue.", Preview: EmailPreview },
      { id: "graph", title: "Mileage graph", body: "The odometer over time with every service and mod on it, and what's due on the road ahead.", Preview: GraphPreview },
      { id: "pdf", title: "PDF history", body: "Every service, mileage, and cost in a clean, printable record to hand the next owner.", Preview: PdfPreview },
    ],
  },
  {
    id: "build",
    title: "Build it",
    accent: "bg-chart-mods",
    features: [
      { id: "mods", title: "Mod tracker", body: "Plan mods, mark them installed, and see what you've put in.", Preview: ModsPreview },
      { id: "order", title: "Order scanning", body: "Screenshot an order email or product page. The mod, brand, price, and parts fill in.", Preview: OrderScanPreview },
      { id: "price", title: "Parts and prices", body: "Store a link on any part. Revlog checks the price daily and shows the drop.", Preview: PricePreview },
      { id: "costs", title: "Costs", body: "Spending by month, by car, and by category, service versus mods.", Preview: CostsPreview },
      { id: "vin", title: "VIN lookup", body: "Type a VIN and the year, make, model, and trim fill in.", Preview: VinPreview },
    ],
  },
  {
    id: "show",
    title: "Show it",
    accent: "bg-done",
    features: [
      { id: "post", title: "Build and mod posts", body: "Your installed mods, photos, and part links on one public page, or just the intake you put in Saturday.", Preview: PostPreview },
      { id: "talk", title: "Comments and likes", body: "Talk shop with other drivers under their builds.", Preview: CommentsPreview },
      { id: "private", title: "Private garage", body: "Your history, receipts, and photos stay yours. Nothing is public until you post it.", Preview: PrivatePreview },
    ],
  },
];

export function FeatureExplorer() {
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const group = GROUPS.find((g) => g.id === groupId)!;
  const active = group.features.find((f) => f.id === picked[group.id]) ?? group.features[0];

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + GROUPS.length) % GROUPS.length;
    setGroupId(GROUPS[next].id);
    tabs.current[next]?.focus();
  }

  const preview = (
    <div key={active.id} className="preview-in lg:h-[24rem]" aria-hidden>
      <active.Preview />
    </div>
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Feature groups"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {GROUPS.map((g, i) => {
          const selected = g.id === groupId;
          return (
            <button
              key={g.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`tab-${g.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="feature-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setGroupId(g.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`relative shrink-0 rounded-md px-4 py-3 font-display text-2xl font-semibold transition-colors sm:text-3xl ${selected ? "text-chalk" : "text-steel hover:text-chalk"}`}
            >
              {g.title}
              <span
                className={`absolute inset-x-4 bottom-0 h-1 rounded-full transition-opacity duration-150 ${g.accent} ${selected ? "opacity-100" : "opacity-0"}`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <div
        id="feature-panel"
        role="tabpanel"
        aria-labelledby={`tab-${group.id}`}
        className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10"
      >
        <ul className="space-y-1">
          {group.features.map((f) => {
            const on = f.id === active.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => ({ ...p, [group.id]: f.id }))}
                  className={`relative w-full rounded-lg border py-3 pr-4 pl-5 text-left transition-colors ${on ? "border-graphite bg-panel" : "border-transparent hover:bg-panel/60"}`}
                >
                  <span
                    className={`absolute top-3 bottom-3 left-0 w-1 rounded-full ${group.accent} ${on ? "opacity-100" : "opacity-0"}`}
                    aria-hidden
                  />
                  <span className={`block font-medium ${on ? "text-chalk" : "text-chalk/85"}`}>{f.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-steel">{f.body}</span>
                </button>
                {/* On phones the preview opens right under the picked feature. */}
                {on && <div className="mt-2 mb-3 lg:hidden">{preview}</div>}
              </li>
            );
          })}
        </ul>
        <div className="hidden lg:sticky lg:top-24 lg:block">{preview}</div>
      </div>
    </div>
  );
}
