// Shrinks a photo in the browser before upload, so big phone pictures
// stay well under the server's upload limit.
export async function resizeImage(file: File, maxSize = 1024, quality = 0.85): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That photo couldn't be read. Try a JPG or PNG.");
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
