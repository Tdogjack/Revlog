import Link from "next/link";
import { Gauge } from "lucide-react";
import { OdometerDemo } from "@/components/odometer-demo";
import { SignedInSwitch } from "@/components/signed-in-switch";
import { SiteFooter } from "@/components/site-footer";

// What's in the log, grouped the way a driver thinks about it.
const groups = [
  {
    title: "Keep it running",
    items: [
      ["Service history", "Mileage, cost, shop, notes, parts, and receipt photos for every job."],
      ["Receipt scanning", "Snap the shop receipt. The date, mileage, cost, shop, and parts fill in for you to check."],
      ["Reminders and emails", "By miles, months, or whichever comes first. A heads-up before it's due, and a nudge while it's overdue."],
      ["Mileage graph", "The odometer over time with every service and mod on it, and what's due on the road ahead."],
      ["PDF history", "A clean, printable record to hand the next owner."],
    ],
  },
  {
    title: "Build it",
    items: [
      ["Mod tracker", "Plan mods, mark them installed, and see what you've put in."],
      ["Order scanning", "Screenshot an order email or product page. The mod, brand, price, and parts fill in."],
      ["Parts and prices", "Store links on any part. Revlog checks the price daily."],
      ["Costs", "Spending by month, by car, and by category, service versus mods."],
      ["VIN lookup", "Type a VIN and the year, make, model, and trim fill in."],
    ],
  },
  {
    title: "Show it",
    items: [
      ["Build posts", "Your installed mods, photos, and part links on one public page."],
      ["New mod posts", "Share the intake you put in on Saturday, with photos."],
      ["Comments and likes", "Talk shop with other drivers under their builds."],
      ["Private garage", "Nothing is public until you post it."],
    ],
  },
];

const steps = [
  ["Add your car", "A VIN or the basics, a photo, and the odometer."],
  ["Log what's been done", "Scan old receipts and order emails, or type in past services and mods."],
  ["Set reminders", "Pick a service and the interval fills in."],
  ["Share the build", "Post it to the community when you're proud of it."],
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-graphite">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Gauge className="h-5 w-5 text-redline" aria-hidden />
            <span>
              Rev<span className="text-redline">log</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#log" className="hidden px-2 py-2 text-steel hover:text-chalk md:block">
              What&apos;s in it
            </a>
            <Link href="/community" className="hidden px-2 py-2 text-steel hover:text-chalk sm:block">
              Community
            </Link>
            <Link href="/demo" className="hidden px-2 py-2 text-steel hover:text-chalk sm:block">
              Demo
            </Link>
            <SignedInSwitch
              signedIn={
                <Link href="/garage" className="btn btn-primary">
                  Your garage
                </Link>
              }
              signedOut={
                <>
                  <Link href="/login" className="px-2 py-2 text-steel hover:text-chalk">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn btn-primary">
                    Sign up
                  </Link>
                </>
              }
            />
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 md:pt-20">
          <div className="grid items-end gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
            <h1 className="font-display text-5xl leading-[0.95] font-semibold sm:text-7xl">
              Every oil change and every mod, logged.
            </h1>
            <div>
              <p className="max-w-xl text-lg leading-relaxed text-steel">
                Revlog keeps your car&apos;s service history, tells you what&apos;s due before
                it&apos;s late, and tracks the build. Drag the slider below to put miles on this
                M3.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <SignedInSwitch
                  signedIn={
                    <Link href="/garage" className="btn btn-primary btn-lg px-5">
                      Go to your garage
                    </Link>
                  }
                  signedOut={
                    <Link href="/signup" className="btn btn-primary btn-lg px-5">
                      Start your garage
                    </Link>
                  }
                />
                <Link href="/demo" className="btn btn-lg px-5">
                  Try the demo garage
                </Link>
              </div>
              <p className="mt-4 text-sm text-steel">
                Free. Your garage stays private. The demo needs no account.
              </p>
            </div>
          </div>
          <div className="mt-12">
            <OdometerDemo />
          </div>
        </section>

        <section id="log" className="scroll-mt-8 border-t border-graphite">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
              What&apos;s in the log
            </h2>
            <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
              {groups.map((g) => (
                <div key={g.title}>
                  <h3 className="border-b border-graphite pb-3 font-display text-2xl font-semibold">
                    {g.title}
                  </h3>
                  <dl>
                    {g.items.map(([term, detail]) => (
                      <div key={term} className="border-b border-rule py-4">
                        <dt className="font-medium">{term}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-steel">{detail}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-graphite">
          <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 md:py-24">
            <Showcase
              title="Snap the receipt, skip the typing"
              body="Take a photo of the shop's receipt and Revlog fills in the date, mileage, cost, shop, and every part, then adds the photo to the record. Bought a part online? Screenshot the order email or product page and the mod, brand, price, and part link fill in. You check each field before it saves."
              preview={<ScanPreview />}
            />
            <Showcase
              flip
              title="See where the money goes"
              body="Monthly spending split between service and mods, totals by car, and your biggest categories, all from what you've already logged. Leave a cost blank and Revlog adds up the parts."
              preview={<CostsPreview />}
            />
            <Showcase
              title="Show off the build"
              body="Share your build or a mod you just installed, with photos from your garage. Build posts list every installed mod, with part links if you want them."
              preview={<PostPreview />}
            />
          </div>
        </section>

        <section className="border-t border-graphite">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
              Up and running in four steps
            </h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map(([title, body], i) => (
                <li key={title} className="border-t-2 border-graphite pt-4 first:border-redline">
                  <span className="readout text-3xl text-steel">{i + 1}</span>
                  <h3 className="mt-2 font-medium">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-steel">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-graphite">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-end md:py-24">
            <h2 className="max-w-2xl font-display text-4xl leading-none font-semibold sm:text-6xl">
              Add your first car. It takes about a minute.
            </h2>
            <SignedInSwitch
              signedIn={
                <Link href="/garage" className="btn btn-primary btn-lg shrink-0 px-6">
                  Go to your garage
                </Link>
              }
              signedOut={
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <Link href="/demo" className="btn btn-lg px-6">
                    Try the demo first
                  </Link>
                  <Link href="/signup" className="btn btn-primary btn-lg px-6">
                    Create your account
                  </Link>
                </div>
              }
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Showcase({
  title,
  body,
  preview,
  flip,
}: {
  title: string;
  body: string;
  preview: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={flip ? "md:order-2" : ""}>
        <h2 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">{title}</h2>
        <p className="mt-4 max-w-md leading-relaxed text-steel">{body}</p>
      </div>
      <div aria-hidden>{preview}</div>
    </div>
  );
}

// A shop receipt beside the service form it filled in.
function ScanPreview() {
  const parts = [
    ["Castrol Edge 10W-60, 7 qt", "$78.00"],
    ["Mahle oil filter OX 387D", "$14.50"],
  ];
  const lines = [...parts, ["Labor", "$36.90"]];
  const fields = [
    ["Service", "Oil change"],
    ["Date", "Apr 26, 2026"],
    ["Mileage", "43,620 mi"],
    ["Cost", "$129.40"],
  ];
  return (
    <div className="grid gap-4 rounded-lg border border-graphite bg-panel p-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <div className="rounded-sm bg-chalk px-4 py-4 font-mono text-[11px] leading-relaxed text-carbon">
        <p className="text-center font-semibold">AUTOBAHN SERVICE CO.</p>
        <p className="text-center">Service dept.</p>
        <div className="my-2 border-t border-dashed border-carbon/40" />
        <p>04/26/2026</p>
        <p>Odometer 43620</p>
        <div className="my-2 border-t border-dashed border-carbon/40" />
        {lines.map(([item, price]) => (
          <p key={item} className="flex justify-between gap-2">
            <span className="truncate">{item}</span>
            <span>{price.slice(1)}</span>
          </p>
        ))}
        <div className="my-2 border-t border-dashed border-carbon/40" />
        <p className="flex justify-between font-semibold">
          <span>TOTAL</span>
          <span>129.40</span>
        </p>
      </div>
      <div className="min-w-0">
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-steel">{label}</p>
              <p className="field mt-1 truncate text-sm">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-steel">Parts</p>
        {parts.map(([item, price]) => (
          <p key={item} className="mt-1 flex justify-between gap-2 border-b border-rule pb-1 text-xs">
            <span className="truncate">{item}</span>
            <span className="text-steel tabular-nums">{price}</span>
          </p>
        ))}
        <p className="mt-3 text-xs text-done">Filled in from the photo. Check each field before saving.</p>
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
    <div className="rounded-lg border border-graphite bg-panel p-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["All time", "$4,812"],
          ["Last 12 months", "$1,936"],
          ["Mods", "$2,150"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-steel">{label}</p>
            <p className="readout mt-1 text-2xl sm:text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex h-32 items-end gap-2 border-b border-graphite">
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
    <div className="rounded-lg border border-graphite bg-panel p-5">
      <div className="flex flex-wrap items-center gap-x-3 text-sm text-steel">
        <span className="font-medium text-chalk">@redline_rob</span>
        <span>2019 Honda Civic Si</span>
        <span className="ml-auto text-xs">New mod</span>
      </div>
      <p className="mt-3 font-display text-2xl leading-tight font-semibold">
        Just installed: Mishimoto cold air intake
      </p>
      <p className="mt-1 text-sm text-steel">
        Sounds mean on the pull, took about an hour with basic tools.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["from-redline/50", "from-steel/40", "from-graphite"].map((tone) => (
          <div key={tone} className={`aspect-[4/3] rounded-md bg-gradient-to-br ${tone} to-carbon`} />
        ))}
      </div>
      <div className="mt-4 border-t border-graphite pt-3 text-sm">
        <p className="font-medium">Parts</p>
        {[
          ["Mishimoto MMAI-CIV-16", "$349.99"],
          ["Silicone coupler", "$24.95"],
        ].map(([name, price]) => (
          <p key={name} className="mt-1 flex justify-between text-xs">
            <span className="underline decoration-graphite underline-offset-2">{name}</span>
            <span className="text-steel tabular-nums">{price}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
