import { authed, fail } from "@/lib/api";
import { pdfResponse, serviceHistoryPdf } from "@/lib/history-pdf";

// The car's service history as a PDF, for the app to save or share.
export const GET = authed<{ id: string }>(async ({ user, params }) => {
  const pdf = await serviceHistoryPdf(user.id, params.id);
  return pdf ? pdfResponse(pdf) : fail("That car wasn't found.", 404);
});
