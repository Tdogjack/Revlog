"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Gauge, RotateCcw, X } from "lucide-react";
import { useDemo } from "./demo-store";

// Quick links to each demo car, like the signed-in header.
export function DemoCarLinks() {
  const demo = useDemo();
  if (!demo) return null;
  return (
    <div className="flex basis-full items-center gap-x-4 overflow-x-auto text-sm md:basis-auto md:border-l md:border-graphite md:pl-6">
      {demo.cars.map((car) => (
        <Link
          key={car.id}
          href={`/demo/${car.id}`}
          className="inline-flex min-h-9 max-w-48 shrink-0 items-center text-steel hover:text-chalk"
        >
          <span className="truncate">{car.nickname}</span>
        </Link>
      ))}
    </div>
  );
}

export function DemoHeader() {
  return (
    <header className="border-b border-graphite">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="h-5 w-5 text-redline" aria-hidden />
            <span>
              Rev<span className="text-redline">log</span>
            </span>
          </Link>
          <div className="flex items-center gap-x-4 text-sm">
            <Link href="/demo" className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
              Garage
            </Link>
            <Link href="/community" className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
              Community
            </Link>
          </div>
          <DemoCarLinks />
        </div>
        <div className="flex items-center gap-x-4 text-sm">
          <Link href="/login" className="inline-flex min-h-9 items-center text-steel hover:text-chalk">
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}

// Says this is a sample garage and how long changes last.
export function DemoBanner() {
  const demo = useDemo();
  return (
    <div className="border-b border-graphite bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <p className="py-1.5 text-steel">
          <span className="font-medium text-chalk">Demo garage.</span> Update mileage, mark
          services done, and change mods. Nothing is saved, and a refresh starts over.
        </p>
        <div className="flex items-center gap-2">
          {demo?.edited && (
            <button type="button" onClick={demo.reset} className="btn border-transparent text-steel hover:text-chalk">
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset demo
            </button>
          )}
          <Link href="/signup" className="btn">
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
          className={`absolute top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-edge bg-panel p-4 text-left shadow-lg shadow-black/40 ${align === "right" ? "right-0" : "left-0"}`}
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
