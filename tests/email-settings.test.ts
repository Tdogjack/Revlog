import { beforeEach, describe, expect, it, vi } from "vitest";

const { values } = vi.hoisted(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })) }));

vi.mock("@/db", () => ({ db: { insert: () => ({ values }) } }));
vi.mock("@/lib/vehicles", () => ({ isUuid: () => true }));

beforeEach(() => vi.clearAllMocks());

describe("reminder settings", () => {
  it("accepts a percent from 50 to 99", async () => {
    const { saveReminderSettings } = await import("@/lib/email-settings");
    expect(await saveReminderSettings("u", true, "80")).toBeNull();
    expect(values).toHaveBeenCalledWith({ userId: "u", reminderPercent: 80 });
  });

  it("treats a blank percent as the default", async () => {
    const { saveReminderSettings } = await import("@/lib/email-settings");
    expect(await saveReminderSettings("u", false, " ")).toBeNull();
    expect(values).toHaveBeenCalledWith({ userId: "u", reminderPercent: null });
    expect(values).toHaveBeenCalledWith({ userId: "u", reminderEmails: false });
  });

  it.each(["49", "100", "80.5", "abc"])("refuses %s and saves nothing", async (percent) => {
    const { saveReminderSettings } = await import("@/lib/email-settings");
    expect(await saveReminderSettings("u", true, percent)).toMatch(/50 to 99/);
    expect(values).not.toHaveBeenCalled();
  });
});
