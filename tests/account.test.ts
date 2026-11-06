import { beforeEach, describe, expect, it, vi } from "vitest";

const { execute, usernameTaken, createProfile, signUp } = vi.hoisted(() => ({
  execute: vi.fn(),
  usernameTaken: vi.fn(async () => false),
  createProfile: vi.fn(async () => true),
  signUp: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { execute } }));
vi.mock("@/lib/email-verification", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/lib/photos", () => ({ deleteAllPhotos: vi.fn() }));
vi.mock("@/lib/profiles", () => ({ usernameTaken, createProfile }));

const client = { auth: { signUp } } as never;
const good = { email: "a@b.co", password: "Goodpass1", username: "gearhead", agreed: true };

beforeEach(() => {
  vi.clearAllMocks();
  signUp.mockResolvedValue({
    data: { user: { id: "u", identities: [{}] }, session: null },
    error: null,
  });
});

describe("registerAccount", () => {
  it("creates the account and profile when everything passes", async () => {
    const { registerAccount } = await import("@/lib/account");
    expect(await registerAccount(client, good, "https://x")).toEqual({ session: null });
    expect(createProfile).toHaveBeenCalledWith("u", "gearhead");
  });

  it.each([
    ["a username the text filter blocks", { username: "fuck_you" }],
    ["a reserved username", { username: "admin" }],
    ["no terms agreement", { agreed: false }],
    ["a weak password", { password: "short" }],
  ])("refuses %s before reaching Supabase", async (_label, change) => {
    const { registerAccount } = await import("@/lib/account");
    const result = await registerAccount(client, { ...good, ...change }, "https://x");
    expect(result).toHaveProperty("error");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("refuses a taken username", async () => {
    usernameTaken.mockResolvedValueOnce(true);
    const { registerAccount } = await import("@/lib/account");
    expect(await registerAccount(client, good, "https://x")).toHaveProperty("error");
  });
});

describe("removeAccount", () => {
  it("does nothing until DELETE is typed", async () => {
    const { removeAccount } = await import("@/lib/account");
    expect(await removeAccount("u", "delete")).toBe("Type DELETE to confirm.");
    expect(execute).not.toHaveBeenCalled();
  });

  it("removes the user once confirmed", async () => {
    const { removeAccount } = await import("@/lib/account");
    expect(await removeAccount("u", " DELETE ")).toBeNull();
    expect(execute).toHaveBeenCalledOnce();
  });
});
