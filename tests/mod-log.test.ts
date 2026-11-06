import { beforeEach, describe, expect, it, vi } from "vitest";

const { syncParts, settlePartsCost, createMod, updateMod } = vi.hoisted(() => ({
  syncParts: vi.fn(async () => []),
  settlePartsCost: vi.fn(async () => {}),
  createMod: vi.fn(async () => ({ id: "mod" }) as { id: string } | null),
  updateMod: vi.fn(async () => ({ id: "mod" }) as { id: string } | null),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/parts", () => ({
  syncParts,
  settlePartsCost,
  parsePartRows: (json: string) =>
    json === "bad" ? { error: "unreadable" } : { rows: json ? JSON.parse(json) : [] },
}));
vi.mock("@/lib/mods", async () => {
  const { z } = await import("zod");
  return {
    createMod,
    updateMod,
    modInput: z
      .looseObject({ part: z.string().min(1, "Enter the part.") })
      .transform((m) => ({ ...m, cost: m.cost ? String(m.cost) : null })),
  };
});

const fields = (extra: Record<string, unknown> = {}) => {
  const body: Record<string, unknown> = { part: "Coilovers", category: "suspension", ...extra };
  return (k: string) => body[k];
};

beforeEach(() => vi.clearAllMocks());

describe("adding a mod", () => {
  it("saves the mod and its parts", async () => {
    const { logMod, readModFields } = await import("@/lib/mod-log");
    const parts = JSON.stringify([{ name: "End links" }]);
    const result = await logMod("u", "car", readModFields(fields({ parts })));
    expect(result).toEqual({ id: "mod" });
    expect(syncParts).toHaveBeenCalledWith("u", "car", { modId: "mod" }, [{ name: "End links" }]);
  });

  it("explains what to fix before saving anything", async () => {
    const { logMod, readModFields } = await import("@/lib/mod-log");
    const result = await logMod("u", "car", readModFields(fields({ part: "" })));
    expect(result).toEqual({ error: "Enter the part." });
    expect(createMod).not.toHaveBeenCalled();
  });

  it("refuses an unreadable parts list before saving anything", async () => {
    const { logMod, readModFields } = await import("@/lib/mod-log");
    const result = await logMod("u", "car", readModFields(fields({ parts: "bad" })));
    expect(result).toEqual({ error: "unreadable" });
    expect(createMod).not.toHaveBeenCalled();
  });

  it("says so when the car isn't this person's", async () => {
    createMod.mockResolvedValueOnce(null);
    const { logMod, readModFields } = await import("@/lib/mod-log");
    const result = await logMod("u", "car", readModFields(fields()));
    expect(result).toEqual({ error: "That car wasn't found." });
    expect(syncParts).not.toHaveBeenCalled();
  });
});

describe("editing a mod", () => {
  it("leaves saved parts alone when none are sent", async () => {
    const { editModEntry, readModFields } = await import("@/lib/mod-log");
    const raw = readModFields(fields());
    expect("parts" in raw).toBe(false);
    expect(await editModEntry("u", "car", "mod", raw)).toBeNull();
    expect(syncParts).not.toHaveBeenCalled();
  });

  it("syncs parts when the list is sent, even an empty one", async () => {
    const { editModEntry, readModFields } = await import("@/lib/mod-log");
    await editModEntry("u", "car", "mod", readModFields(fields({ parts: "[]" })));
    expect(syncParts).toHaveBeenCalledWith("u", "car", { modId: "mod" }, []);
  });

  it("totals the cost from parts only when cost is blank", async () => {
    const { editModEntry, readModFields } = await import("@/lib/mod-log");
    await editModEntry("u", "car", "mod", readModFields(fields()));
    expect(settlePartsCost).toHaveBeenLastCalledWith("u", { modId: "mod" }, [], false);
    await editModEntry("u", "car", "mod", readModFields(fields({ cost: "349.99" })));
    expect(settlePartsCost).toHaveBeenLastCalledWith("u", { modId: "mod" }, [], true);
  });

  it("reports a mod that doesn't exist", async () => {
    updateMod.mockResolvedValueOnce(null);
    const { editModEntry, readModFields } = await import("@/lib/mod-log");
    expect(await editModEntry("u", "car", "mod", readModFields(fields()))).toBe(
      "That mod wasn't found.",
    );
  });
});
