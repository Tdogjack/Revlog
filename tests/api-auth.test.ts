import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, garageView, carView, setVehicleMileage } = vi.hoisted(() => ({
  getUser: vi.fn(),
  garageView: vi.fn(),
  carView: vi.fn(),
  setVehicleMileage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/api-views", () => ({ garageView, carView, serviceTypesView: vi.fn() }));
vi.mock("@/lib/community", () => ({ FEATURED_BUILD_TAG: "featured-build" }));
vi.mock("@/lib/vehicle-removal", () => ({ deleteVehicle: vi.fn() }));
vi.mock("@/lib/service-plan", () => ({ buildServicePlan: vi.fn(), pickAnswers: vi.fn() }));
vi.mock("@/lib/vehicles", () => ({
  isUuid: (id: string) => /^[0-9a-f-]{36}$/.test(id),
  setVehicleMileage,
  localDateOrToday: () => undefined,
  mileageInput: { safeParse: (v: unknown) => ({ success: true, data: Number(v) }) },
  readVehicleFields: () => ({}),
  vehicleInput: { safeParse: () => ({ success: false, error: { issues: [{ message: "x" }] } }) },
  createVehicle: vi.fn(),
  getVehicle: vi.fn(),
  removalConfirmed: vi.fn(),
  updateVehicle: vi.fn(),
}));

const CAR = "11111111-1111-1111-1111-111111111111";
const USER = { id: "22222222-2222-2222-2222-222222222222", email: "a@example.com" };
const request = (body?: unknown) =>
  new NextRequest("http://localhost/api", {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
const context = <P>(params: P) => ({ params: Promise.resolve(params) });
// What Next.js passes to a route with no ids in its path.
const noParams = { params: Promise.resolve(undefined) } as never;

beforeEach(() => vi.clearAllMocks());

describe("signed-in routes", () => {
  it("answers 401 JSON without a session, and reads nothing", async () => {
    getUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/vehicles/route");
    const res = await GET(request(), noParams);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: expect.any(String) });
    expect(garageView).not.toHaveBeenCalled();
  });

  it("loads the garage for the token's user", async () => {
    getUser.mockResolvedValue(USER);
    garageView.mockResolvedValue([]);
    const { GET } = await import("@/app/api/v1/vehicles/route");
    const res = await GET(request(), noParams);
    expect(res.status).toBe(200);
    expect(garageView).toHaveBeenCalledWith(USER.id);
  });

  it("answers 404 for a car the user doesn't own", async () => {
    getUser.mockResolvedValue(USER);
    carView.mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/vehicles/[id]/route");
    const res = await GET(request(), context({ id: CAR }));
    expect(res.status).toBe(404);
    expect(carView).toHaveBeenCalledWith(USER.id, CAR);
  });

  it("rejects ids that aren't uuids before they reach a query", async () => {
    getUser.mockResolvedValue(USER);
    const { GET } = await import("@/app/api/v1/vehicles/[id]/route");
    const res = await GET(request(), context({ id: "1 or 1=1" }));
    expect(res.status).toBe(404);
    expect(carView).not.toHaveBeenCalled();
  });

  it("ignores a user id in the body", async () => {
    getUser.mockResolvedValue(USER);
    const { POST } = await import("@/app/api/v1/vehicles/[id]/mileage/route");
    await POST(request({ currentMileage: 1000, userId: "someone-else" }), context({ id: CAR }));
    expect(setVehicleMileage).toHaveBeenCalledWith(USER.id, CAR, 1000, undefined);
  });

  it("hides failures behind a plain 500", async () => {
    getUser.mockResolvedValue(USER);
    garageView.mockRejectedValue(new Error("connection to postgres://secret failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/v1/vehicles/route");
    const res = await GET(request(), noParams);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
