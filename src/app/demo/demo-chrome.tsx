"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { Brand, DesktopNav, TabBar, TopBar, type NavItem } from "@/components/site-chrome";
import { useDemo } from "./demo-store";

const DEMO_NAV: NavItem[] = [
  { href: "/demo", label: "Garage", icon: "garage" },
  { href: "/community", label: "Community", icon: "community" },
];

// Quick links to each demo car, like the signed-in header. Wide screens only.
export function DemoCarLinks() {
  const demo = useDemo();
  if (!demo) return null;
  return (
    <div className="hidden min-w-0 items-center gap-1 overflow-x-auto border-l border-graphite pl-3 lg:flex">
      {demo.cars.map((car) => (
        <Link key={car.id} href={`/demo/${car.id}`} className="nav-link max-w-44 shrink-0">
          <span className="truncate">{car.nickname}</span>
        </Link>
      ))}
    </div>
  );
}

export function DemoHeader() {
  return (
    <TopBar>
      <div className="flex min-w-0 items-center gap-x-4">
        <Brand />
        <DesktopNav items={DEMO_NAV} />
        <DemoCarLinks />
      </div>
      <div className="flex shrink-0 items-center gap-x-1">
        <Link href="/login" className="nav-link">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary">
          Sign up
        </Link>
      </div>
    </TopBar>
  );
}

export function DemoTabBar() {
  return <TabBar items={DEMO_NAV} />;
}

// Says this is a sample garage and how long changes last.
export function DemoBanner() {
  const demo = useDemo();
  return (
    <div className="border-b border-graphite bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 text-sm sm:px-6">
        <p className="py-1 text-pretty text-steel">
          <span className="font-medium text-chalk">Demo garage.</span> Change anything you
          like<span className="hidden sm:inline">: update mileage, mark services done, edit mods</span>.
          Nothing is saved, and a refresh starts over.
        </p>
        <div className="flex items-center gap-2">
          {demo?.edited && (
            <button type="button" onClick={demo.reset} className="btn border-transparent text-steel hover:text-chalk">
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset demo
            </button>
          )}
          <Link href="/signup" className="btn hidden sm:inline-flex">
            Start your own garage
          </Link>
        </div>
      </div>
    </div>
  );
}

// A control for something that needs an account. Clicking it explains that
// and offers sign-up, instead of pretending to work.
export function AccountOnly({
  message,
  className = "btn",
  align = "right",
  children,
  ...rest
}: {
  message: string;
  className?: string;
  align?: "left" | "right";
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        {...rest}
        ref={button}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={className}
      >
        {children}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Needs an account"
          className={`pop-in absolute top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-edge bg-panel p-4 text-left shadow-2xl shadow-black/50 ${align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"}`}
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              title="Close"
              className="icon-btn -mt-1.5 -mr-2"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <Link href="/signup" className="btn btn-primary mt-3 w-full">
            Create your account
          </Link>
        </div>
      )}
    </div>
  );
}
