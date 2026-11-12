"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { MileageChart } from "@/components/mileage-chart";
import { PhotoCredit } from "@/components/photo-credit";
import { StatusBadge } from "@/components/status-badge";
import { VehiclePhoto } from "@/components/vehicle-photo";
import { demoCarName, demoTimeline, evaluateDemoReminders, type DemoCar } from "@/lib/demo-garage";
import { AccountOnly } from "./demo-chrome";
import { useDemo } from "./demo-store";

// The demo version of the garage list: same cards, sample cars.
export function DemoGarageList() {
  const demo = useDemo();
  if (!demo) {
    return (
      <ul className="mt-8 space-y-3" aria-busy="true" aria-label="Loading the demo cars">
        {[0, 1, 2].map((i) => (
          <li key={i} className="skeleton h-[108px] sm:h-[192px]" />
        ))}
      </ul>
    );
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <AccountOnly
          className="btn btn-primary"
          message="Adding your own car needs a free account. Type a VIN and the year, make, model, and trim fill in."
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add a car
        </AccountOnly>
      </div>
      <ul className="mt-4 space-y-3">
        {demo.cars.map((car) => {
          const reminders = evaluateDemoReminders(car);
          const top = reminders[0]?.result.status;
          const count = reminders.filter((r) => r.result.status === top).length;
          const timeline = demoTimeline(car, demo.today);
          return (
            <li key={car.id}>
              <Link
                href={`/demo/${car.id}`}
                className="lift group flex gap-4 rounded-2xl border border-graphite bg-panel p-3 hover:border-steel sm:gap-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6 lg:flex-none">
                  <VehiclePhoto
                    src={car.photo.src}
                    alt={demoCarName(car)}
                    className="aspect-[4/3] w-28 shrink-0 rounded-[0.75rem] sm:w-56"
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center py-1 lg:w-56 lg:flex-none">
                    <p className="line-clamp-2 font-display text-2xl font-semibold sm:text-3xl">
                      {car.nickname}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-steel">{demoCarName(car)}</p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                      <p className="text-steel">
                        <span className="readout text-xl text-chalk">
                          {car.currentMileage.toLocaleString("en-US")}
                        </span>{" "}
                        <span className="text-xs">mi</span>
                      </p>
                      {top &&
                        (top === "ok" ? (
                          <StatusBadge status="ok" label="All caught up" />
                        ) : (
                          <StatusBadge
                            status={top}
                            label={`${count} ${top === "overdue" ? "overdue" : "due soon"}`}
                          />
                        ))}
                    </div>
                  </div>
                </div>
                {timeline && (
                  <div className="hidden min-w-0 flex-1 border-l border-rule py-1 pl-6 lg:block">
                    <MileageChart timeline={timeline} compact />
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-steel">
        Photos from Wikimedia Commons:{" "}
        {demo.cars.map((car, i) => (
          <span key={car.id}>
            {i > 0 && ", "}
            <DemoPhotoCredit car={car} />
          </span>
        ))}
        .
      </p>
    </>
  );
}

export function DemoPhotoCredit({ car }: { car: DemoCar }) {
  return <PhotoCredit label={`${car.make} ${car.model}`} photo={car.photo} />;
}
