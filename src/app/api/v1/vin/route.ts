import { authed, fail, ok, readBody } from "@/lib/api";
import { decodeVin, normalizeVin } from "@/lib/vin";

// Reads the car's details from its VIN. Nothing is saved here.
export const POST = authed(async ({ request }) => {
  const body = await readBody(request);
  const result = await decodeVin(normalizeVin(String(body.vin ?? "")));
  return "error" in result ? fail(result.error) : ok(result);
});
