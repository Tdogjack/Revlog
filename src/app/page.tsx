import Link from "next/link";
import { Bell, Gauge, Wrench, Zap } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const features = [
  {
    icon: Wrench,
    title: "Service history",
    body: "Every record, receipt, and mile in one place.",
  },
  {
    icon: Zap,
    title: "Mod tracker",
    body: "Parts, costs, and install notes for every build.",
  },
  {
    icon: Bell,
    title: "Smart reminders",
    body: "Alerts by mileage or date, before it's late.",
  },
];

const sampleItems = [
  { label: "Oil change", status: "Due soon", tone: "bg-due-bg text-due" },
  { label: "Cold air intake", status: "Installed", tone: "bg-graphite text-chalk" },
  { label: "Brake pads", status: "Done", tone: "bg-done-bg text-done" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-graphite">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="h-5 w-5 text-redline" aria-hidden />
            <span>
              Rev<span className="text-redline">log</span>
            </span>
          </Link>
          <div className="hidden gap-8 text-sm text-steel md:flex">
            <a href="#features" className="hover:text-chalk">
              Features
            </a>
            <a href="#pricing" className="hover:text-chalk">
              Pricing
            </a>
            <a href="#community" className="hover:text-chalk">
              Community
            </a>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-steel hover:text-chalk">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-redline px-3 py-1.5 font-medium text-white hover:bg-redline-hover"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <p className="font-mono text-xs tracking-widest text-redline">
              {"// YOUR CAR'S FULL STORY"}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Every oil change, every mod. <span className="text-redline">Logged.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-steel">
              Track maintenance, plan builds, and never miss a service again. Built for people who
              actually care about their cars.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-redline px-5 py-2.5 font-medium text-white hover:bg-redline-hover"
              >
                Start your garage
              </Link>
              <a
                href="#features"
                className="rounded-md border border-graphite px-5 py-2.5 hover:border-steel"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-graphite bg-panel p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">2019 Civic Si</span>
              <span className="font-mono text-xs text-steel">48,210 mi</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite">
              <div className="h-full w-[86%] bg-redline" />
            </div>
            <p className="mt-2 text-xs text-steel">Oil life · 412 mi left</p>
            <ul className="mt-4">
              {sampleItems.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between border-t border-graphite py-3 text-sm"
                >
                  <span>{item.label}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${item.tone}`}>{item.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg bg-panel p-5">
                <Icon className="h-5 w-5 text-redline" aria-hidden />
                <h2 className="mt-3 font-medium">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-steel">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
