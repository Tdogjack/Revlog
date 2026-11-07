import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  decodeVin: vi.fn(async () => ({ year: "2014", make: "Honda", model: "Civic", trim: "Si" }) as object),
  getVehicle: vi.fn(async () => ({ year: 2014, make: "Honda", model: "Civic", trim: "Si" }) as object | null),
  removalConfirmed: vi.fn((_car: unknown, typed: string) => typed === "DELETE"),
  deleteVehicle: vi.fn(async () => {}),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/vin", () => ({
  decodeVin: mocks.decodeVin,
  normalizeVin: (vin: string) => vin.trim().toUpperCase(),
}));
vi.mock("@/lib/api-views", () => ({ carView: vi.fn() }));
vi.mock("@/lib/community", () => ({ FEATURED_BUILD_TAG: "featured-build" }));
vi.mock("@/lib/vehicle-removal", () => ({ deleteVehicle: mocks.deleteVehicle }));
vi.mock("@/lib/vehicles", () => ({
  isUuid: (id: string) => /^[0-9a-f-]{36}$/.test(id),
  getVehicle: mocks.getVehicle,
  readVehicleFields: vi.fn(),
  removalConfirmed: mocks.removalConfirmed,
  updateVehicle: vi.fn(),
  vehicleInput: {},
}));

const USER = { id: "22222222-2222-2222-2222-222222222222", email: "a@example.com" };
const CAR = "11111111-1111-1111-1111-111111111111";
const noParams = { params: Promise.resolve(undefined) } as never;
const context = { params: Promise.resolve({ id: CAR }) };
const send = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api", { method, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue(USER);
});

describe("VIN lookup", () => {
  it("returns the decoded car from a tidied VIN", async () => {
    const { POST } = await import("@/app/api/v1/vin/route");
    const res = await POST(send("POST", { vin: " 2hgfg4a51eh000000 " }), noParams);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ make: "Honda" });
    expect(mocks.decodeVin).toHaveBeenCalledWith("2HGFG4A51EH000000");
  });

  it("passes on a VIN it can't read", async () => {
    mocks.decodeVin.mockResolvedValueOnce({ error: "That VIN wasn't found." });
    const { POST } = await import("@/app/api/v1/vin/route");
    const res = await POST(send("POST", { vin: "bad" }), noParams);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "That VIN wasn't found." });
  });

  it("needs a signed-in account", async () => {
    mocks.getUser.mockResolvedValueOnce(null);
    const { POST } = await import("@/app/api/v1/vin/route");
    expect((await POST(send("POST", { vin: "x" }), noParams)).status).toBe(401);
    expect(mocks.decodeVin).not.toHaveBeenCalled();
  });
});

describe("removing a car", () => {
  it("removes it once the owner confirms", async () => {
    const { DELETE } = await import("@/app/api/v1/vehicles/[id]/route");
    const res = await DELETE(send("DELETE", { confirm: "DELETE" }), context);
    expect(res.status).toBe(200);
    expect(mocks.deleteVehicle).toHaveBeenCalledWith(USER.id, CAR);
  });

  it("keeps the car without the typed confirmation", async () => {
    const { DELETE } = await import("@/app/api/v1/vehicles/[id]/route");
    const res = await DELETE(send("DELETE", { confirm: "oops" }), context);
    expect(res.status).toBe(400);
    expect(mocks.deleteVehicle).not.toHaveBeenCalled();
  });

  it("won't touch another person's car", async () => {
    mocks.getVehicle.mockResolvedValueOnce(null);
    const { DELETE } = await import("@/app/api/v1/vehicles/[id]/route");
    const res = await DELETE(send("DELETE", { confirm: "DELETE" }), context);
    expect(res.status).toBe(404);
    expect(mocks.deleteVehicle).not.toHaveBeenCalled();
  });
});
