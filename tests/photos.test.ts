import { beforeEach, describe, expect, it, vi } from "vitest";

const { isEmailVerified, uploadVehiclePhoto, getVehicle } = vi.hoisted(() => ({
  isEmailVerified: vi.fn(async () => true),
  uploadVehiclePhoto: vi.fn(async () => "new/path.webp"),
  getVehicle: vi.fn(async () => null as object | null),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/email-verification", () => ({
  CONFIRM_EMAIL_FIRST: "confirm first",
  isEmailVerified,
}));
vi.mock("@/lib/photos", () => ({
  deleteVehiclePhoto: vi.fn(),
  readPhoto: () => new File(["x"], "a.webp", { type: "image/webp" }),
  signedPhotoUrls: vi.fn(),
  uploadVehiclePhoto,
}));
vi.mock("@/lib/mods", () => ({ getMod: vi.fn() }));
vi.mock("@/lib/service-records", () => ({ getServiceRecord: vi.fn() }));
vi.mock("@/lib/vehicles", () => ({
  getVehicle,
  isUuid: () => true,
  setVehiclePhoto: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("photo uploads", () => {
  it("need a confirmed email", async () => {
    isEmailVerified.mockResolvedValueOnce(false);
    const { saveUploadedPhoto } = await import("@/lib/gallery");
    expect(await saveUploadedPhoto("u", "car", "build", null, new FormData())).toBe("confirm first");
    expect(uploadVehiclePhoto).not.toHaveBeenCalled();
  });

  it("are refused for someone else's car before any file is stored", async () => {
    const { replaceVehiclePhoto, saveUploadedPhoto } = await import("@/lib/gallery");
    expect(await replaceVehiclePhoto("u", "car", new FormData())).toBe("That car wasn't found.");
    expect(await saveUploadedPhoto("u", "car", "build", null, new FormData())).toBe(
      "That car wasn't found.",
    );
    expect(uploadVehiclePhoto).not.toHaveBeenCalled();
  });

  it("need a known place to go", async () => {
    const { saveUploadedPhoto } = await import("@/lib/gallery");
    expect(await saveUploadedPhoto("u", "car", "post", null, new FormData())).toBe(
      "That photo doesn't have a place to go.",
    );
  });
});
