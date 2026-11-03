"use client";

import { createContext, useContext, useState } from "react";
import { demoCars, type DemoCar } from "@/lib/demo-garage";
import type { ModStatus } from "@/lib/mod-categories";
import { useToday } from "@/lib/use-today";

type DemoStore = {
  today: string;
  cars: DemoCar[];
  edited: boolean;
  setMileage: (carId: string, miles: number) => void;
  markDone: (carId: string, reminderId: string) => void;
  setModStatus: (carId: string, modId: string, status: ModStatus) => void;
  reset: () => void;
};

const Store = createContext<DemoStore | null>(null);

// Demo cars live in memory for the visit. Moving between demo pages keeps
// changes; a refresh starts over.
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const today = useToday();
  const [cars, setCars] = useState<DemoCar[] | null>(null);
  const [edited, setEdited] = useState(false);
  if (today && !cars) setCars(demoCars(today));

  if (!today || !cars) return <Store.Provider value={null}>{children}</Store.Provider>;

  const update = (carId: string, change: (car: DemoCar) => DemoCar) => {
    setCars((cs) => cs!.map((c) => (c.id === carId ? change(c) : c)));
    setEdited(true);
  };

  const store: DemoStore = {
    today,
    cars,
    edited,
    setMileage: (carId, miles) =>
      update(carId, (car) => ({
        ...car,
        currentMileage: miles,
        readings: [
          ...car.readings.filter((r) => r.readOn !== today),
          { readOn: today, mileage: miles },
        ],
      })),
    markDone: (carId, reminderId) =>
      update(carId, (car) => {
        const r = car.reminders.find((x) => x.id === reminderId);
        if (!r) return car;
        return {
          ...car,
          records: [
            {
              id: `done-${reminderId}-${car.records.length}`,
              servicedOn: today,
              category: r.serviceCategory ?? "other",
              title: r.task,
              mileage: car.currentMileage,
              cost: null,
              shop: null,
              notes: null,
              parts: [],
            },
            ...car.records,
          ],
        };
      }),
    setModStatus: (carId, modId, status) =>
      update(carId, (car) => ({
        ...car,
        mods: car.mods.map((m) =>
          m.id !== modId
            ? m
            : status === "installed" && !m.installedOn
              ? { ...m, status, installedOn: today, installedMileage: car.currentMileage }
              : { ...m, status },
        ),
      })),
    reset: () => {
      setCars(demoCars(today));
      setEdited(false);
    },
  };

  return <Store.Provider value={store}>{children}</Store.Provider>;
}

// Null until the browser has worked out the demo's dates.
export function useDemo() {
  return useContext(Store);
}
