// Model year from a VIN, without a network lookup. Pure, so the reminder
// math can use it anywhere.

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
// Position 10 codes, cycling every 30 years from 1980 (no I, O, Q, U, Z, or 0).
const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";

// Each code means two model years 30 years apart (A is 1980 or 2010). The
// stored year breaks the tie, since it came from the VIN lookup or the owner.
// Position 7 can also tell them apart, but only for North American cars.
export function vinModelYear(vin: string | null, statedYear: number): number | null {
  if (!vin || !VIN_PATTERN.test(vin)) return null;
  const index = YEAR_CODES.indexOf(vin[9]);
  if (index === -1) return null;
  const latestPlausible = new Date().getUTCFullYear() + 1;
  const candidates = [1980 + index, 2010 + index, 2040 + index].filter(
    (y) => y <= latestPlausible,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, y) =>
    Math.abs(y - statedYear) < Math.abs(best - statedYear) ? y : best,
  );
}
