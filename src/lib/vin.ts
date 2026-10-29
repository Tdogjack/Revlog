import "server-only";

// Decodes a VIN with the free NHTSA vPIC service (US-market vehicles).
export type DecodedVin = { year: string; make: string; model: string; trim: string };

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

// "HONDA" -> "Honda", but keep short all-caps names like "BMW" or "GMC".
function tidyName(value: string) {
  if (value.length <= 3) return value;
  return value.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export async function decodeVin(vin: string): Promise<DecodedVin | { error: string }> {
  if (!VIN_PATTERN.test(vin)) {
    return { error: "A VIN is 17 letters and numbers (never I, O, or Q)." };
  }
  let data: { Results?: Record<string, string>[] };
  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) throw new Error(String(response.status));
    data = await response.json();
  } catch {
    return { error: "The VIN lookup service didn't respond. Fill in the details by hand." };
  }
  const r = data.Results?.[0];
  if (!r?.Make || !r.ModelYear) {
    return { error: "That VIN wasn't found. Check it, or fill in the details by hand." };
  }
  return {
    year: r.ModelYear,
    make: tidyName(r.Make),
    model: r.Model ?? "",
    trim: r.Trim || r.Series || "",
  };
}
