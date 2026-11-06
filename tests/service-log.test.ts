import { beforeEach, describe, expect, it, vi } from "vitest";

const { syncParts, settlePartsCost, updateServiceRecord } = vi.hoisted(() => ({
  syncParts: vi.fn(async () => []),
  settlePartsCost: vi.fn(async () => {}),
  updateServiceRecord: vi.fn(async () => ({ id: "rec" })),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/parts", () => ({
  syncParts,
  settlePartsCost,
  parsePartRows: (json: string) => ({ rows: json ? JSON.parse(json) : [] }),
}));
vi.mock("@/lib/reminder-store", () => ({
  getReminder: vi.fn(),
  listReminders: vi.fn(async () => []),
  setReminderStart: vi.fn(),
}));
vi.mock("@/lib/service-types", () => ({
  listServiceTypes: vi.fn(async () => []),
  resolveServiceType: vi.fn(async (_u: string, choice: string) => ({ key: choice })),
}));
vi.mock("@/lib/service-records", async () => {
  const { z } = await import("zod");
  return {
    createServiceRecord: vi.fn(async () => ({ id: "rec" })),
    updateServiceRecord,
    serviceRecordInput: z.looseObject({}).transform((r) => ({
      ...r,
      cost: r.cost ? String(r.cost) : null,
      title: "t",
    })),
  };
});
vi.mock("@/lib/vehicles", () => ({ getVehicle: vi.fn(async () => ({ currentMileage: 10 })) }));

const fields = (extra: Record<string, unknown> = {}) => {
  const body: Record<string, unknown> = { category: "oil", servicedOn: "2026-01-01", ...extra };
  return (k: string) => body[k];
};

beforeEach(() => vi.clearAllMocks());

describe("editing a service record", () => {
  it("leaves saved parts alone when the app doesn't send any", async () => {
    const { editService, readServiceFields } = await import("@/lib/service-log");
    const raw = readServiceFields(fields());
    expect("parts" in raw).toBe(false);
    await editService("u", "car", "rec", raw);
    expect(updateServiceRecord).toHaveBeenCalled();
    expect(syncParts).not.toHaveBeenCalled();
  });

  it("still re-totals the cost from saved parts when cost is blank", async () => {
    const { editService, readServiceFields } = await import("@/lib/service-log");
    await editService("u", "car", "rec", readServiceFields(fields()));
    expect(settlePartsCost).toHaveBeenCalledWith("u", { serviceRecordId: "rec" }, [], false);
  });

  it("syncs parts when the list is sent, as the website always does", async () => {
    const { editService, readServiceFields } = await import("@/lib/service-log");
    await editService("u", "car", "rec", readServiceFields(fields({ parts: "" })));
    expect(syncParts).toHaveBeenCalledWith("u", "car", { serviceRecordId: "rec" }, []);
  });
});
