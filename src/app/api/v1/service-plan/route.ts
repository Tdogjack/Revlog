import { authed, ok, readBody } from "@/lib/api";
import type { PlanPreview } from "@/lib/api-types";
import { buildServicePlan, describeInterval, pickAnswers } from "@/lib/service-plan";

// The reminders a car would start with, for the add-car form to show before
// saving. Adding the car builds the same plan again on the server.
export const POST = authed(async ({ request }) => {
  const body = await readBody(request);
  const text = (key: string) => String(body[key] ?? "").trim();
  const plan = buildServicePlan(
    { year: text("year"), make: text("make"), model: text("model") },
    pickAnswers(body),
  );
  return ok<PlanPreview>({
    source: plan.source,
    makeName: plan.makeName,
    adjustedFor: plan.adjustedFor,
    items: plan.items.map((item) => {
      const interval = describeInterval(item.intervalMiles, item.intervalMonths);
      const usual = describeInterval(item.usualMiles, item.usualMonths);
      return {
        service: item.service,
        task: item.task,
        interval,
        usual: usual === interval ? null : usual,
      };
    }),
  });
});
