"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Car, Gauge, MessagesSquare, Receipt, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: NavIcon };

const ICONS = {
  garage: Car,
  community: MessagesSquare,
  costs: Receipt,
  account: UserRound,
} satisfies Record<string, LucideIcon>;
export type NavIcon = keyof typeof ICONS;

// The deepest nav item the current path sits under, so /garage/costs lights
// Costs and not Garage too.
function useCurrent(items: NavItem[]) {
  const path = usePathname();
  const matches = items.filter((i) => path === i.href || path.startsWith(`${i.href}/`));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function Brand() {
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold">
      <Gauge className="h-5 w-5 text-redline" aria-hidden />
      <span>
        Rev<span className="text-redline">log</span>
      </span>
    </Link>
  );
}

// The sticky top bar. A translucent layer, so the page scrolls under it, with
// a hairline only along its bottom edge.
export function TopBar({ children }: { children: React.ReactNode }) {
  return (
    <header className="chrome sticky top-0 z-30 border-b border-graphite/70 pt-[env(safe-area-inset-top)]">
      <nav className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-x-4 px-4 sm:px-6">
        {children}
      </nav>
    </header>
  );
}

// Header links for wider screens. Phones get the tab bar instead.
export function DesktopNav({ items }: { items: NavItem[] }) {
  // The path only exists at request time, so the links render unlit first.
  return (
    <Suspense fallback={<DesktopLinks items={items} />}>
      <LiveDesktopLinks items={items} />
    </Suspense>
  );
}

function LiveDesktopLinks({ items }: { items: NavItem[] }) {
  return <DesktopLinks items={items} current={useCurrent(items)} />;
}

function DesktopLinks({ items, current }: { items: NavItem[]; current?: string }) {
  return (
    <div className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.href === current ? "page" : undefined}
          className="nav-link"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

// The phone tab bar: the same destinations as the header, under the thumb,
// clear of the home indicator.
export function TabBar({ items }: { items: NavItem[] }) {
  return (
    <Suspense fallback={<Tabs items={items} />}>
      <LiveTabs items={items} />
    </Suspense>
  );
}

function LiveTabs({ items }: { items: NavItem[] }) {
  return <Tabs items={items} current={useCurrent(items)} />;
}

function Tabs({ items, current }: { items: NavItem[]; current?: string }) {
  return (
    <>
      {/* Holds room at the foot of the page so the footer clears the bar. */}
      <div aria-hidden className="h-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Main"
        className="chrome fixed inset-x-0 bottom-0 z-30 border-t border-graphite/70 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex max-w-md px-2">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const here = item.href === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={here ? "page" : undefined}
                className="tab"
              >
                <Icon className="h-6 w-6" strokeWidth={here ? 2.25 : 1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
