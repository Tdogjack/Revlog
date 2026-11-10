import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { pdfResponse, serviceHistoryPdf } from "@/lib/history-pdf";

// A printable PDF of a car's service history, handy when selling the car.
export async function GET(_request: NextRequest, ctx: RouteContext<"/garage/[id]/history">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return new Response("Log in to download this.", { status: 401 });
  const pdf = await serviceHistoryPdf(user.id, id);
  return pdf ? pdfResponse(pdf) : new Response("That car wasn't found.", { status: 404 });
}
