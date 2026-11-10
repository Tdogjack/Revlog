import { authed, ok } from "@/lib/api";
import type { CarCatalog } from "@/lib/api-types";
import { CAR_MAKES } from "@/lib/car-catalog";
import {
  CAUTION_OPTIONS,
  CONDITION_OPTIONS,
  DEFAULT_ANSWERS,
  DRIVING_OPTIONS,
  ROAD_OPTIONS,
} from "@/lib/service-plan";

// The makes, models, and driving questions the add-car form picks from.
export const GET = authed(async () =>
  ok<CarCatalog>({
    makes: CAR_MAKES.map(({ name, models }) => ({ name, models: [...models] })),
    driving: [...DRIVING_OPTIONS],
    roads: [...ROAD_OPTIONS],
    conditions: [...CONDITION_OPTIONS],
    caution: [...CAUTION_OPTIONS],
    defaults: DEFAULT_ANSWERS,
  }),
);
