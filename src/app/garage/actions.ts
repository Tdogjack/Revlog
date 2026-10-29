"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createVehicle, vehicleInput } from "@/lib/vehicles";

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

export async function addVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const raw = Object.fromEntries(
    ["year", "make", "model", "trim", "nickname", "vin", "currentMileage"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );

  const parsed = vehicleInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, values: raw };
  }

  const vehicle = await createVehicle(user.id, parsed.data);
  redirect(`/garage/${vehicle.id}`);
}
