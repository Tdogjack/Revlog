import { ApiError, authHeaders } from "@/lib/api";
import { API_URL } from "@/lib/config";

// Browser previews: opens the PDF in a new tab.
export async function shareServiceHistory(carId: string, _carName: string) {
  const res = await fetch(`${API_URL}/vehicles/${carId}/service/pdf`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new ApiError("The PDF didn't download. Try again.", res.status);
  window.open(URL.createObjectURL(await res.blob()), "_blank");
}
