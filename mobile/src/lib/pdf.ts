import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ApiError, authHeaders } from "@/lib/api";
import { API_URL } from "@/lib/config";

// Fetches the car's service history PDF and opens the share sheet, where it
// can be saved to Files, printed, or sent to a buyer.
export async function shareServiceHistory(carId: string, carName: string) {
  const name = carName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "car";
  const target = new File(Paths.cache, `${name}-service-history.pdf`);
  let file: File;
  try {
    file = await File.downloadFileAsync(`${API_URL}/vehicles/${carId}/service/pdf`, target, {
      headers: await authHeaders(),
      idempotent: true,
    });
  } catch {
    throw new ApiError("The PDF didn't download. Check your connection and try again.", 0);
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "Service history",
  });
}
