import "server-only";
import sharp from "sharp";

// A small copy of every photo, saved next to it, for grids, cards, and the
// feed. Full photos are only loaded in the full-size viewer, which cuts photo
// bandwidth several times over.

// Longest side, in pixels: sharp enough for a three-across grid or a feed card
// on a phone screen.
export const THUMB_EDGE = 800;

// "user/car/abc.webp" -> "user/car/abc.thumb.webp". Derived from the photo's
// own path, so no database column is needed to find it.
export const thumbPathOf = (path: string) => `${path.replace(/\.[^./]+$/, "")}.thumb.webp`;

export const isThumbPath = (path: string) => path.endsWith(".thumb.webp");

export async function makeThumb(photo: Blob): Promise<Blob> {
  const input = Buffer.from(await photo.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
  return new Blob([new Uint8Array(output)], { type: "image/webp" });
}
