import { describe, expect, it } from "vitest";
import { carUrgency, rankReminders } from "@/lib/reminders";

const car = { year: 2015, vin: null, currentMileage: 50_000 };
const reminder = (id: string, lastDoneMileage: number) => ({
  id,
  vehicleId: "car",
  serviceCategory: null,
  intervalMiles: 5000,
  intervalMonths: null,
  lastDoneOn: "2020-01-01",
  lastDoneMileage,
  createdAt: new Date("2020-01-01"),
});

describe("rankReminders", () => {
  it("puts the most urgent first and counts how many share it", () => {
    const ranked = rankReminders(
      [reminder("fine", 49_000), reminder("late", 40_000), reminder("late2", 41_000)],
      car,
      [],
    );
    expect(ranked[0].result.status).toBe("overdue");
    expect(ranked.at(-1)?.reminder.id).toBe("fine");
    expect(carUrgency(ranked)).toEqual({ status: "overdue", count: 2 });
  });

  it("has no urgency for a car with no reminders", () => {
    expect(carUrgency([])).toBeNull();
  });
});
