import { beforeEach, describe, expect, it, vi } from "vitest";

const { headerValue, authGetUser, plainClient, cookieClient } = vi.hoisted(() => {
  const authGetUser = vi.fn();
  const client = () => ({ auth: { getUser: authGetUser } });
  return {
    headerValue: vi.fn(),
    authGetUser,
    plainClient: vi.fn(client),
    cookieClient: vi.fn(client),
  };
});

vi.mock("next/headers", () => ({
  headers: async () => ({ get: headerValue }),
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({ supabaseUrl: "https://x.supabase.co", supabaseKey: "k" }));
vi.mock("@supabase/supabase-js", () => ({ createClient: plainClient }));
vi.mock("@supabase/ssr", () => ({ createServerClient: cookieClient }));

beforeEach(() => {
  vi.clearAllMocks();
  authGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});

describe("getUser", () => {
  it("checks a bearer token with Supabase and scopes the client to it", async () => {
    headerValue.mockReturnValue("Bearer abc.def");
    const { getUser } = await import("@/lib/auth");
    expect((await getUser())?.id).toBe("u1");
    expect(authGetUser).toHaveBeenCalledWith("abc.def");
    expect(plainClient).toHaveBeenCalledWith(
      "https://x.supabase.co",
      "k",
      expect.objectContaining({ global: { headers: { Authorization: "Bearer abc.def" } } }),
    );
    expect(cookieClient).not.toHaveBeenCalled();
  });

  it("keeps using the website's cookie session without a token", async () => {
    headerValue.mockReturnValue(null);
    const { getUser } = await import("@/lib/auth");
    await getUser();
    expect(cookieClient).toHaveBeenCalled();
    expect(authGetUser).toHaveBeenCalledWith();
  });

  it("treats a malformed header as no token", async () => {
    headerValue.mockReturnValue("Basic abc");
    const { bearerToken } = await import("@/lib/supabase/server");
    expect(await bearerToken()).toBeNull();
  });
});
