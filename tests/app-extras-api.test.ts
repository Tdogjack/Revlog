import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  bearerToken: vi.fn(async () => "token" as string | null),
  getPart: vi.fn(async () => ({ id: "part", lastCheckedAt: null }) as object | null),
  checkPartPrice: vi.fn(async () => null as string | null),
  serviceHistoryPdf: vi.fn(
    async () => ({ bytes: new Uint8Array([1]), filename: "car.pdf" }) as object | null,
  ),
  scanBlocked: vi.fn(async () => null as string | null),
  scanHistoryText: vi.fn(async () => ({ data: { entries: [], unreadable: null } }) as object),
}));

vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/supabase/server", () => ({ bearerToken: mocks.bearerToken }));
vi.mock("@/lib/supabase/env", () => ({ supabaseUrl: "https://auth.test", supabaseKey: "key" }));
vi.mock("@/lib/parts", () => ({ getPart: mocks.getPart, checkPartPrice: mocks.checkPartPrice }));
vi.mock("@/lib/history-pdf", () => ({
  serviceHistoryPdf: mocks.serviceHistoryPdf,
  pdfResponse: () => new Response("pdf", { headers: { "Content-Type": "application/pdf" } }),
}));
vi.mock("@/lib/scan-gate", () => ({ scanBlocked: mocks.scanBlocked }));
vi.mock("@/lib/history-scan", () => ({ scanHistoryText: mocks.scanHistoryText }));
vi.mock("@/lib/service-types", () => ({ listServiceTypes: vi.fn(async () => []) }));
vi.mock("@/lib/vehicles", () => ({ isUuid: (id: string) => /^[0-9a-f-]{36}$/.test(id) }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/email-verification", () => ({ sendVerificationEmail: vi.fn() }));
vi.mock("@/lib/photos", () => ({ deleteAllPhotos: vi.fn() }));
vi.mock("@/lib/profiles", () => ({ createProfile: vi.fn(), usernameTaken: vi.fn() }));

const USER = { id: "22222222-2222-2222-2222-222222222222", email: "a@example.com" };
const CAR = "11111111-1111-1111-1111-111111111111";
const PART = "33333333-3333-3333-3333-333333333333";
const noParams = { params: Promise.resolve(undefined) } as never;
const send = (body: unknown) =>
  new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify(body) });
const sheet = (name: string, text: string) => {
  const form = new FormData();
  form.set("file", new File([text], name, { type: "text/csv" }));
  return new NextRequest("http://localhost/api", { method: "POST", body: form });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue(USER);
});

describe("service plan preview", () => {
  it("uses the make's schedule for a listed car", async () => {
    const { POST } = await import("@/app/api/v1/service-plan/route");
    const res = await POST(send({ year: "2019", make: "Honda", model: "Civic" }), noParams);
    const plan = await res.json();
    expect(plan.source).toBe("make");
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.items[0]).toHaveProperty("interval");
  });

  it("falls back to general intervals for a car that isn't listed", async () => {
    const { POST } = await import("@/app/api/v1/service-plan/route");
    const res = await POST(send({ year: "1985", make: "Yugo", model: "GV" }), noParams);
    expect((await res.json()).source).toBe("general");
  });

  it("shortens intervals for hard driving and says why", async () => {
    const { POST } = await import("@/app/api/v1/service-plan/route");
    const car = { year: "2019", make: "Honda", model: "Civic" };
    const hard = await (await POST(send({ ...car, driving: "hard" }), noParams)).json();
    expect(hard.adjustedFor.length).toBeGreaterThan(0);
    expect(hard.items.some((i: { usual: string | null }) => i.usual)).toBe(true);
  });

  it("needs a signed-in account", async () => {
    mocks.getUser.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/v1/car-catalog/route");
    const res = await GET(new NextRequest("http://localhost/api"), noParams);
    expect(res.status).toBe(401);
  });
});

describe("checking a part's price", () => {
  const context = { params: Promise.resolve({ id: CAR, partId: PART }) };

  it("checks the price and passes back what went wrong", async () => {
    mocks.checkPartPrice.mockResolvedValueOnce("No price found on that page.");
    const { POST } = await import("@/app/api/v1/vehicles/[id]/parts/[partId]/price/route");
    const res = await POST(send({}), context);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ error: "No price found on that page." });
  });

  it("won't check the same part twice in a minute", async () => {
    mocks.getPart.mockResolvedValueOnce({ id: PART, lastCheckedAt: new Date() });
    const { POST } = await import("@/app/api/v1/vehicles/[id]/parts/[partId]/price/route");
    expect((await POST(send({}), context)).status).toBe(429);
    expect(mocks.checkPartPrice).not.toHaveBeenCalled();
  });

  it("won't check another person's part", async () => {
    mocks.getPart.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/v1/vehicles/[id]/parts/[partId]/price/route");
    expect((await POST(send({}), context)).status).toBe(404);
    expect(mocks.getPart).toHaveBeenCalledWith(USER.id, PART);
  });
});

describe("service history PDF", () => {
  const context = { params: Promise.resolve({ id: CAR }) };

  it("sends the owner's PDF", async () => {
    const { GET } = await import("@/app/api/v1/vehicles/[id]/service/pdf/route");
    const res = await GET(new NextRequest("http://localhost/api"), context);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(mocks.serviceHistoryPdf).toHaveBeenCalledWith(USER.id, CAR);
  });

  it("has nothing for another person's car", async () => {
    mocks.serviceHistoryPdf.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/v1/vehicles/[id]/service/pdf/route");
    expect((await GET(new NextRequest("http://localhost/api"), context)).status).toBe(404);
  });
});

describe("changing the password", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sets the new password as the signed-in account", async () => {
    const { POST } = await import("@/app/api/v1/me/password/route");
    const res = await POST(send({ password: "Wrench2024", confirm: "Wrench2024" }), noParams);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://auth.test/auth/v1/user");
    expect(init.headers.Authorization).toBe("Bearer token");
  });

  it("turns down a weak password without asking the auth service", async () => {
    const { POST } = await import("@/app/api/v1/me/password/route");
    const res = await POST(send({ password: "short", confirm: "short" }), noParams);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns down passwords that don't match", async () => {
    const { POST } = await import("@/app/api/v1/me/password/route");
    const res = await POST(send({ password: "Wrench2024", confirm: "Wrench2025" }), noParams);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("spreadsheet import", () => {
  it("reads rows from a sheet with a date and a service", async () => {
    const { POST } = await import("@/app/api/v1/scans/sheet/route");
    const csv = "Date,Service,Mileage,Cost\n2024-03-02,Oil change,48210,89.99\n2024-06-10,Tire rotation,52000,25\n";
    const res = await POST(sheet("history.csv", csv), noParams);
    expect(res.status).toBe(200);
    const { entries } = await res.json();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ servicedOn: "2024-03-02", mileage: "48210", cost: "89.99" });
    expect(mocks.scanHistoryText).not.toHaveBeenCalled();
  });

  it("only sends an unmatched sheet to the AI reader when scans are allowed", async () => {
    mocks.scanBlocked.mockResolvedValueOnce("allow AI scanning");
    const { POST } = await import("@/app/api/v1/scans/sheet/route");
    const res = await POST(sheet("odd.csv", "a,b\nfoo,bar\nbaz,qux\n"), noParams);
    expect(res.status).toBe(400);
    expect(mocks.scanHistoryText).not.toHaveBeenCalled();
  });

  it("turns down old Excel files", async () => {
    const { POST } = await import("@/app/api/v1/scans/sheet/route");
    const res = await POST(sheet("history.xls", "x"), noParams);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/\.xlsx or \.csv/);
  });
});
