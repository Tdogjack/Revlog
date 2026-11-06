import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/env", () => ({ supabaseUrl: "https://x.supabase.co", supabaseKey: "k" }));

describe("proxy", () => {
  it("skips the phone API but still covers website pages", async () => {
    const { config } = await import("@/proxy");
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    expect(matcher.test("/api/v1/vehicles")).toBe(false);
    expect(matcher.test("/garage")).toBe(true);
    expect(matcher.test("/api/cron/reminders")).toBe(true);
  });
});
