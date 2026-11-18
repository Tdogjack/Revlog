import { describe, expect, it } from "vitest";
import { intervalUsed } from "@/lib/reminders";

describe("intervalUsed", () => {
  it("is the share of the mileage interval used", () => {
    const used = intervalUsed(
      { intervalMiles: 5000, intervalMonths: null },
      { status: "ok", milesLeft: 1000, daysLeft: null },
    );
    expect(used).toBeCloseTo(0.8);
  });

  it("takes whichever limit is further along", () => {
    const used = intervalUsed(
      { intervalMiles: 10000, intervalMonths: 12 },
      { status: "due_soon", milesLeft: 8000, daysLeft: 30 },
    );
    expect(used).toBeGreaterThan(0.9);
  });

  it("goes past 1 when overdue", () => {
    const used = intervalUsed(
      { intervalMiles: 10000, intervalMonths: null },
      { status: "overdue", milesLeft: -400, daysLeft: null },
    );
    expect(used).toBeCloseTo(1.04);
  });

  it("counts a never-done reminder as fully used", () => {
    const used = intervalUsed(
      { intervalMiles: null, intervalMonths: 24 },
      { status: "overdue", milesLeft: null, daysLeft: null, neverDone: true },
    );
    expect(used).toBe(1);
  });

  it("is null with nothing to count from", () => {
    expect(
      intervalUsed(
        { intervalMiles: 5000, intervalMonths: null },
        { status: "unknown", milesLeft: null, daysLeft: null },
      ),
    ).toBeNull();
    expect(
      intervalUsed(
        { intervalMiles: 5000, intervalMonths: null },
        { status: "ok", milesLeft: null, daysLeft: null },
      ),
    ).toBeNull();
  });
});
