import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isEmailVerified: vi.fn(async () => true),
  hasAiConsent: vi.fn(async () => true),
  scanReceipt: vi.fn(async () => ({ data: { values: {}, parts: [], extras: [] } }) as object),
  scanModReceipt: vi.fn(async () => ({ data: { values: {}, parts: [] } }) as object),
  scanHistoryFile: vi.fn(async () => ({ data: { entries: [], unreadable: null } }) as object),
  saveHistoryRows: vi.fn(async () => ({ saved: [{ key: 1, id: "rec" }] }) as object),
}));

vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/email-verification", () => ({
  CONFIRM_EMAIL_FIRST: "confirm your email",
  isEmailVerified: mocks.isEmailVerified,
}));
vi.mock("@/lib/ai-consent", () => ({
  AI_CONSENT_NEEDED: "allow AI scanning",
  hasAiConsent: mocks.hasAiConsent,
}));
vi.mock("@/lib/receipt-scan", () => ({ scanReceipt: mocks.scanReceipt }));
vi.mock("@/lib/mod-scan", () => ({ scanModReceipt: mocks.scanModReceipt }));
vi.mock("@/lib/history-scan", () => ({ scanHistoryFile: mocks.scanHistoryFile }));
vi.mock("@/lib/history-save", () => ({ saveHistoryRows: mocks.saveHistoryRows }));
vi.mock("@/lib/service-types", () => ({ listServiceTypes: vi.fn(async () => []) }));

const USER = { id: "22222222-2222-2222-2222-222222222222", email: "a@example.com" };
const noParams = { params: Promise.resolve(undefined) } as never;
const upload = (field: string, empty = false) => {
  const form = new FormData();
  form.set(field, new File([empty ? "" : "image"], "photo.jpg", { type: "image/jpeg" }));
  return new NextRequest("http://localhost/api", { method: "POST", body: form });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue(USER);
});

const routes = [
  { name: "receipt", field: "photo", scan: mocks.scanReceipt },
  { name: "mod", field: "photo", scan: mocks.scanModReceipt },
  { name: "history", field: "file", scan: mocks.scanHistoryFile },
];

describe.each(routes)("scanning a $name", ({ name, field, scan }) => {
  const load = async () => (await import(`@/app/api/v1/scans/${name}/route`)).POST;

  it("reads the file for this account", async () => {
    const res = await (await load())(upload(field), noParams);
    expect(res.status).toBe(200);
    expect(scan).toHaveBeenCalledWith(USER.id, expect.any(File), ...(name === "mod" ? [] : [[]]));
  });

  it("sends nothing without AI consent", async () => {
    mocks.hasAiConsent.mockResolvedValueOnce(false);
    const res = await (await load())(upload(field), noParams);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "allow AI scanning" });
    expect(scan).not.toHaveBeenCalled();
  });

  it("sends nothing before the email is confirmed", async () => {
    mocks.isEmailVerified.mockResolvedValueOnce(false);
    const res = await (await load())(upload(field), noParams);
    expect(res.status).toBe(403);
    expect(scan).not.toHaveBeenCalled();
  });

  it("asks for a file when there isn't one", async () => {
    const res = await (await load())(upload(field, true), noParams);
    expect(res.status).toBe(400);
    expect(scan).not.toHaveBeenCalled();
  });

  it("passes on what the scan couldn't read", async () => {
    scan.mockResolvedValueOnce({ error: "not a receipt" });
    const res = await (await load())(upload(field), noParams);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "not a receipt" });
  });

  it("needs a signed-in account", async () => {
    mocks.getUser.mockResolvedValueOnce(null);
    const res = await (await load())(upload(field), noParams);
    expect(res.status).toBe(401);
    expect(scan).not.toHaveBeenCalled();
  });
});

describe("saving reviewed history", () => {
  const save = (rows: unknown) =>
    new NextRequest("http://localhost/api", { method: "POST", body: JSON.stringify({ rows }) });
  const CAR = "11111111-1111-1111-1111-111111111111";
  const context = { params: Promise.resolve({ id: CAR }) };

  it("saves the rows for this account's car", async () => {
    const { POST } = await import("@/app/api/v1/vehicles/[id]/service/history/route");
    const res = await POST(save("[]"), context);
    expect(res.status).toBe(201);
    expect(mocks.saveHistoryRows).toHaveBeenCalledWith(USER.id, CAR, "[]");
  });

  it("says which row needs fixing", async () => {
    mocks.saveHistoryRows.mockResolvedValueOnce({ error: "Add the date", rowKey: 4 });
    const { POST } = await import("@/app/api/v1/vehicles/[id]/service/history/route");
    const res = await POST(save("[]"), context);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ rowKey: 4 });
  });
});
