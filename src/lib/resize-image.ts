// File types the photo inputs accept. HEIC/HEIF is listed explicitly
// because some pickers (Windows, Android) hide it under image/*.
export const PHOTO_ACCEPT = "image/*,.heic,.heif";

function looksHeic(file: File): boolean {
  return /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

// Turns an iPhone HEIC photo into a JPEG most browsers can show. Other
// files pass through untouched. The decoder is large, so it only loads
// when a HEIC photo actually shows up.
export async function toBrowserImage(file: File): Promise<File> {
  if (!looksHeic(file)) return file;
  const { heicTo, isHeic } = await import("heic-to/next");
  if (!(await isHeic(file))) return file;
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
}

// Shrinks a photo in the browser before upload, so big phone pictures
// stay well under the server's upload limit.
export async function resizeImage(file: File, maxSize = 1024, quality = 0.85): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(await toBrowserImage(file), { imageOrientation: "from-image" });
  } catch {
    throw new Error("That photo couldn't be read. Try a JPG, PNG, or HEIC.");
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) throw new Error("That photo couldn't be processed. Try another one.");

  return new File([blob], "photo.webp", { type: "image/webp" });
}

// Replaces the "photo" field with a resized copy, if one was chosen.
export async function withResizedPhoto(formData: FormData): Promise<FormData> {
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    formData.set("photo", await resizeImage(photo));
  } else {
    formData.delete("photo");
  }
  return formData;
}
