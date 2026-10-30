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

  const blob = await encode(canvas, quality);
  return new File([blob], `photo.${blob.type.split("/")[1]}`, { type: blob.type });
}

// Server Actions reject bodies over 1MB, so leave room for form overhead.
const MAX_UPLOAD_BYTES = 900 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

// Safari can't encode WebP and silently hands back a huge PNG instead,
// so fall back to JPEG there, and lower quality until the file fits.
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  let type = "image/webp";
  let blob = await toBlob(canvas, type, quality);
  if (blob && blob.type !== type) {
    type = "image/jpeg";
    blob = await toBlob(canvas, type, quality);
  }
  while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await toBlob(canvas, type, quality);
  }
  if (!blob) throw new Error("That photo couldn't be processed. Try another one.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("That photo is too large. Try a smaller one.");
  return blob;
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
