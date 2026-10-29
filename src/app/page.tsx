import Link from "next/link";
import {
  Bell,
  Camera,
  ChartColumn,
  FileDown,
  Gauge,
  Mail,
  ScanLine,
  Share2,
  Tag,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const features = [
  {
    icon: Wrench,
    title: "Service history",
    body: "Log every oil change and repair with mileage, cost, shop, and notes. Copy a past record in one click, then just update the date and miles.",
  },
  {
    icon: Bell,
    title: "Smart reminders",
    body: "Intervals by miles, months, or both. Reminders reset from your service history, whatever order you log it in, and overdue turns red.",
  },
  {
    icon: Mail,
    title: "Reminder emails",
    body: "A heads-up before service is due: 500 mi or 14 days out, or at a percent of the miles you choose. Weekly nudges while it's overdue.",
  },
  {
    icon: Zap,
    title: "Build tracker",
    body: "Plan mods, mark them installed, and track what you've invested. Every car gets a build photo library, and every mod its own photos.",
  },
  {
    icon: Tag,
    title: "Parts and price tracking",
    body: "Add parts with store links to any mod or service. Revlog checks prices daily and shows when they drop.",
  },
  {
    icon: ChartColumn,
    title: "Cost dashboard",
    body: "See spending by month, by car, and by category, split between service and mods. Leave a cost blank and Revlog totals the parts.",
  },
  {
    icon: Users,
    title: "Community",
    body: "Share your build or a fresh mod with photos, and include part links if you like. Follow other drivers' builds by username.",
  },
  {
    icon: Camera,
    title: "Photos and receipts",
    body: "A photo for each car, build and mod galleries, and receipt photos on service records. Your garage stays private.",
  },
  {
    icon: FileDown,
    title: "PDF service history",
    body: "Download a clean, printable history of every service. Hand it to the next owner when you sell.",
  },
  {
    icon: ScanLine,
    title: "VIN lookup",
    body: "Type a VIN and Revlog fills in the year, make, model, and trim. Custom service types cover everything else.",
  },
];

const steps = [
  {
    n: "01",
    title: "Add your car",
    body: "Enter a VIN or the basics, plus a photo and the odometer.",
  },
  {
    n: "02",
    title: "Log what's been done",
    body: "Past services and installed mods, with parts, costs, and receipts.",
  },
  {
    n: "03",
    title: "Set reminders",
    body: "Pick a service type and the interval fills in. Revlog emails you before it's due.",
  },
  {
    n: "04",
    title: "Share the build",
    body: "Post your build or a new mod to the community when you're proud of it.",
  },
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
            <a href="#how" className="hover:text-chalk">
              How it works
            </a>
            <Link href="/community" className="hover:text-chalk">
              Community
            </Link>
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
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 md:pt-24">
          <div className="max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-redline">
              {"// YOUR CAR'S FULL STORY"}
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">
              Every oil change, every mod. <span className="text-redline">Logged.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-steel">
              Service history, reminders that email you, build tracking with photos and part prices,
              costs, and a community to show it all off. Free, and built for people who actually
              care about their cars.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-md bg-redline px-5 py-2.5 font-medium text-white hover:bg-redline-hover"
              >
                Start your garage
              </Link>
              <Link
                href="/community"
                className="rounded-md border border-graphite px-5 py-2.5 hover:border-steel"
              >
                Browse builds
              </Link>
            </div>
          </div>

          <CarPagePreview />
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Everything your car needs, in one log
          </h2>
          <p className="mt-2 max-w-2xl text-steel">
            From the first oil change to the finished build.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-graphite bg-panel p-5">
                <Icon className="h-5 w-5 text-redline" aria-hidden />
                <h3 className="mt-3 font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-steel">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
          <Showcase
            eyebrow="Reminders"
            title="Know what's due before it's late"
            body="Each reminder counts from your latest matching service, by miles, months, or whichever comes first. Due soon turns amber, overdue turns red, and you get an email either way."
            preview={<ReminderEmailPreview />}
          />
          <Showcase
            flip
            eyebrow="Costs"
            title="See where the money goes"
            body="Monthly spending split between service and mods, totals by car, and your biggest categories, all from what you've already logged."
            preview={<CostsPreview />}
          />
          <Showcase
            eyebrow="Community"
            title="Show off the build"
            body="Share your build or a mod you just installed, with photos from your garage or new uploads. Build posts list the installed mods, with part links if you choose."
            preview={<PostPreview />}
          />
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.n} className="rounded-xl border border-graphite bg-panel p-5">
                <span className="font-mono text-xs text-redline">{step.n}</span>
                <h3 className="mt-2 font-medium">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-steel">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-graphite bg-panel p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-semibold">Start your garage today</h2>
              <p className="mt-2 text-steel">Free to use. Add your first car in under a minute.</p>
            </div>
            <Link
              href="/signup"
              className="shrink-0 rounded-md bg-redline px-5 py-2.5 font-medium text-white hover:bg-redline-hover"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Showcase({
  eyebrow,
  title,
  body,
  preview,
  flip,
}: {
  eyebrow: string;
  title: string;
  body: string;
  preview: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
      <div className={flip ? "md:order-2" : ""}>
        <p className="font-mono text-xs tracking-widest text-redline">
          {`// ${eyebrow.toUpperCase()}`}
        </p>
        <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
        <p className="mt-3 leading-relaxed text-steel">{body}</p>
      </div>
      <div aria-hidden>{preview}</div>
    </div>
  );
}

// A miniature of the real car page: header, service history, build, reminders.
function CarPagePreview() {
  return (
    <div
      aria-hidden
      className="mt-12 overflow-hidden rounded-2xl border border-graphite bg-carbon p-3 shadow-2xl shadow-black/40 sm:p-5"
    >
      <div className="flex items-center gap-4 rounded-xl border border-graphite bg-panel p-4">
        <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-redline/70 to-graphite sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold sm:text-lg">Track toy</p>
          <p className="truncate text-xs text-steel sm:text-sm">2019 Honda Civic Si</p>
        </div>
        <span className="font-mono text-xs text-steel sm:text-sm">48,210 mi</span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          <div className="rounded-xl border border-graphite bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4 text-redline" /> Service history
              </p>
              <span className="rounded-md bg-redline px-2 py-1 text-xs text-white">
                Log service
              </span>
            </div>
            {[
              ["Oct 12", "Oil change", "47,950 mi · $68.40 · Parts: oil, filter"],
              ["Aug 3", "Tire rotation", "45,100 mi · $25.00"],
              ["Jun 18", "Brake pads", "43,800 mi · $189.12 · 2 receipts"],
            ].map(([date, title, meta]) => (
              <div key={title} className="mt-3 flex gap-3 border-t border-graphite pt-3 text-xs">
                <span className="w-12 shrink-0 font-mono text-steel">{date}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block truncate text-steel">{meta}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-graphite bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-redline" /> Build
              </p>
              <span className="flex items-center gap-1 rounded-md border border-graphite px-2 py-1 text-xs">
                <Share2 className="h-3 w-3" /> Share build
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                "from-redline/60 to-carbon",
                "from-steel/40 to-carbon",
                "from-due/40 to-carbon",
                "from-graphite to-carbon",
              ].map((tone) => (
                <div key={tone} className={`aspect-[4/3] rounded-md bg-gradient-to-br ${tone}`} />
              ))}
            </div>
            {[
              ["Mishimoto cold air intake", "Installed · $349.99"],
              ["Coilovers", "Planned · price dropped $40"],
            ].map(([name, meta]) => (
              <div
                key={name}
                className="mt-3 flex items-center justify-between gap-3 border-t border-graphite pt-3 text-xs"
              >
                <span className="truncate text-sm">{name}</span>
                <span className="shrink-0 text-steel">{meta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-graphite bg-panel p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-redline" /> Reminders
          </p>
          {[
            ["Oil change", "Due in 410 mi", "Due soon", "bg-due-bg text-due", "text-due"],
            [
              "Brake fluid",
              "Overdue by 2 months",
              "Overdue",
              "bg-overdue-solid text-white",
              "text-overdue",
            ],
            ["Tire rotation", "Due in 2,250 mi", "OK", "bg-done-bg text-done", "text-steel"],
          ].map(([task, due, badge, badgeTone, dueTone]) => (
            <div key={task} className="mt-3 border-t border-graphite pt-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{task}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badgeTone}`}>
                  {badge}
                </span>
              </div>
              <span className={`mt-1 block ${dueTone}`}>{due}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReminderEmailPreview() {
  return (
    <div className="rounded-xl border border-graphite bg-carbon p-4">
      <p className="text-xs text-steel">
        From Revlog · <span className="text-chalk">Oil change is due soon on your Civic Si</span>
      </p>
      <div className="mt-3 rounded-lg border border-graphite bg-panel p-5">
        <p className="font-semibold">Service coming up</p>
        <p className="mt-1 text-xs text-steel">Based on your service history and mileage.</p>
        <p className="mt-4 text-[11px] font-semibold tracking-wider text-steel uppercase">
          2019 Honda Civic Si
        </p>
        {[
          ["Oil change", "Due in 410 mi", "Due soon", "text-due"],
          ["Brake fluid", "Overdue by 2 months", "Overdue", "text-overdue"],
        ].map(([task, due, label, tone]) => (
          <div
            key={task}
            className="mt-2 flex items-start justify-between gap-3 border-t border-graphite pt-2 text-sm"
          >
            <span>
              {task}
              <span className={`block text-xs ${tone}`}>{due}</span>
            </span>
            <span className={`text-xs font-semibold ${tone}`}>{label}</span>
          </div>
        ))}
        <span className="mt-4 inline-block rounded-md bg-redline px-4 py-2 text-sm font-medium text-white">
          Open your garage
        </span>
      </div>
    </div>
  );
}

function CostsPreview() {
  const months = [
    [30, 0],
    [55, 20],
    [20, 0],
    [70, 25],
    [35, 10],
    [15, 70],
    [60, 0],
    [40, 30],
  ];
  return (
    <div className="rounded-xl border border-graphite bg-panel p-5">
      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          ["All time", "$4,812"],
          ["Last 12 months", "$1,936"],
          ["Mods invested", "$2,150"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-graphite p-3">
            <p className="text-steel">{label}</p>
            <p className="mt-1 text-base font-semibold sm:text-lg">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-32 items-end gap-2 border-b border-graphite">
        {months.map(([service, mods], i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[2px]">
            {mods > 0 && <div className="rounded-t bg-chart-mods" style={{ height: `${mods}%` }} />}
            <div
              className={`bg-chart-service ${mods > 0 ? "" : "rounded-t"}`}
              style={{ height: `${service}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-steel">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-service" /> Service
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-chart-mods" /> Mods
        </span>
      </div>
    </div>
  );
}

function PostPreview() {
  return (
    <div className="rounded-xl border border-graphite bg-panel p-5">
      <div className="flex flex-wrap items-center gap-x-2 text-sm text-steel">
        <span className="font-medium text-chalk">@redline_rob</span>
        <span>·</span>
        <span>2019 Honda Civic Si</span>
        <span className="ml-auto rounded bg-due-bg px-2 py-0.5 text-xs text-due">New mod</span>
      </div>
      <p className="mt-3 text-lg font-semibold">Just installed: Mishimoto cold air intake</p>
      <p className="mt-1 text-sm text-steel">
        Sounds mean on the pull, took about an hour with basic tools.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["from-redline/60", "from-steel/40", "from-graphite"].map((tone) => (
          <div
            key={tone}
            className={`aspect-[4/3] rounded-lg bg-gradient-to-br ${tone} to-carbon`}
          />
        ))}
      </div>
      <div className="mt-4 border-t border-graphite pt-3 text-xs">
        <p className="font-medium">Parts</p>
        {[
          ["Mishimoto MMAI-CIV-16", "$349.99"],
          ["Silicone coupler", "$24.95"],
        ].map(([name, price]) => (
          <p key={name} className="mt-1 flex justify-between">
            <span className="underline decoration-graphite underline-offset-2">{name}</span>
            <span className="text-steel">{price}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
