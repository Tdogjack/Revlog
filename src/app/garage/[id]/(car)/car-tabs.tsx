"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Suspense } from "react";

const TABS = [
  { path: "", label: "Overview" },
  { path: "/build", label: "Build" },
  { path: "/service", label: "Service" },
  { path: "/reminders", label: "Reminders" },
  { path: "/photos", label: "Photos" },
];

// The car's pages. Sticks under the top bar so switching never needs a
// scroll back up. The path only exists at request time, so the tabs render
// as a bare bar first.
export function CarTabs() {
  return (
    <Suspense fallback={<Bar />}>
      <LiveTabs />
    </Suspense>
  );
}

function LiveTabs() {
  const path = usePathname();
  const { id } = useParams<{ id: string }>();
  return <Bar base={`/garage/${id}`} path={path} />;
}

function Bar({ base, path }: { base?: string; path?: string }) {
  return (
    <nav
      aria-label="Car pages"
      className="chrome sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mt-6 border-b border-graphite/70 px-4 sm:-mx-6 sm:px-6"
    >
      <ul className="-ml-2 flex overflow-x-auto py-1 [scrollbar-width:none] sm:-ml-3 sm:gap-1">
        {TABS.map((tab) => {
          if (!base) {
            return (
              <li key={tab.label} className="shrink-0">
                <span className="nav-link px-2 font-semibold sm:px-3">{tab.label}</span>
              </li>
            );
          }
          const href = `${base}${tab.path}`;
          return (
            <li key={tab.label} className="shrink-0">
              <Link
                href={href}
                aria-current={path === href ? "page" : undefined}
                className="nav-link px-2 font-semibold sm:px-3"
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
