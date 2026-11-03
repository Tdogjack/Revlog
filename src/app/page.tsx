import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { FeatureExplorer } from "@/components/landing/feature-explorer";
import { TachCluster } from "@/components/landing/tach-cluster";
import { OdometerDemo } from "@/components/odometer-demo";
import { PhotoCredit } from "@/components/photo-credit";
import { SignedInSwitch } from "@/components/signed-in-switch";
import { SiteFooter } from "@/components/site-footer";
import { demoCarCards } from "@/lib/demo-garage";

const steps = [
  ["Add your car", "A VIN or the basics, a photo, and the odometer."],
  ["Log what's been done", "Scan old receipts and order emails, or type in past services and mods."],
  ["Set reminders", "Pick a service and the interval fills in."],
  ["Share the build", "Post it to the community when you're proud of it."],
];

export default function Home() {
  const cars = demoCarCards();
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-graphite bg-carbon/95">
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
        <section className="relative overflow-hidden">
          {/* The redline band from the gauge, run across the top of the page. */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-redline/60 to-redline" aria-hidden />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 lg:pt-24 lg:pb-28">
            <div>
              <h1 className="font-display text-6xl leading-[0.92] font-semibold tracking-[-0.01em] sm:text-7xl xl:text-8xl">
                Every oil change and every mod, logged.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-steel">
                Revlog keeps your car&apos;s service history, tells you what&apos;s due before
                it&apos;s late, and tracks the build. Scan a receipt and it&apos;s in.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
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
            <TachCluster />
          </div>
        </section>

        <section className="border-t border-graphite bg-panel/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
                Put some miles on it
              </h2>
              <p className="max-w-md text-steel">
                Drag the slider. Reminders count down, the graph runs ahead to what&apos;s due
                next, and Done resets the clock.
              </p>
            </div>
            <div className="mt-10">
              <OdometerDemo />
            </div>
          </div>
        </section>

        <section id="log" className="scroll-mt-16 border-t border-graphite">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
              Everything in the log
            </h2>
            <p className="mt-4 max-w-xl text-steel">
              Pick a feature to see it. These are the same screens you get in your garage.
            </p>
            <div className="mt-10">
              <FeatureExplorer />
            </div>
          </div>
        </section>

        {/* Light like a shop ticket, to break up the dark run. */}
        <section className="bg-chalk text-carbon">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <div className="flex flex-col justify-between gap-4 border-b border-dashed border-carbon/30 pb-8 md:flex-row md:items-end">
              <h2 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
                Up and running in four steps
              </h2>
              <p className="text-carbon/70">About a minute for the first car.</p>
            </div>
            <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
              {steps.map(([title, body], i) => (
                <li key={title} className="lg:border-l lg:border-carbon/15 lg:px-6 lg:first:border-l-0 lg:first:pl-0">
                  <span className="readout text-5xl leading-none text-redline-fill">{i + 1}</span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-carbon/75">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-graphite">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="font-display text-4xl leading-none font-semibold sm:text-5xl">
                Take one for a spin
              </h2>
              <p className="max-w-md text-steel">
                Three sample cars with years of history. Change anything, no account needed.
              </p>
            </div>
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {cars.map((car) => (
                <li key={car.id}>
                  <Link
                    href={`/demo/${car.id}`}
                    className="group block overflow-hidden rounded-lg border border-graphite bg-panel transition-colors hover:border-steel"
                  >
                    <div className="overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={car.photo.src}
                        alt={car.name}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-2xl leading-tight font-semibold">{car.nickname}</p>
                          <p className="truncate text-sm text-steel">{car.name}</p>
                        </div>
                        <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-steel group-hover:text-chalk" aria-hidden />
                      </div>
                      <p className="mt-3 text-sm text-steel">
                        <span className="readout text-lg text-chalk">{car.currentMileage.toLocaleString("en-US")}</span> mi
                        <span className="mx-2" aria-hidden>
                          ·
                        </span>
                        {car.services} services, {car.installed} mods
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-steel">
              Photos from Wikimedia Commons:{" "}
              {cars.map((car, i) => (
                <span key={car.id}>
                  {i > 0 && ", "}
                  <PhotoCredit label={car.name} photo={car.photo} />
                </span>
              ))}
              .
            </p>

            <div className="mt-20 flex flex-col items-start justify-between gap-6 rounded-2xl border border-graphite bg-panel p-8 md:flex-row md:items-end md:p-12">
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
                  <Link href="/signup" className="btn btn-primary btn-lg shrink-0 px-6">
                    Create your account
                  </Link>
                }
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
