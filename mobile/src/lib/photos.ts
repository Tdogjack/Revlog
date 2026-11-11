import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";
import { editPhotos, type EditablePhoto } from "@/components/photo-editor";
import { ApiError } from "@/lib/api";

const MAX_EDGE = 1600;
// The server's limit is 1 MB; these steps land under it for phone photos.
const QUALITIES = [0.75, 0.6, 0.45];
const MAX_BYTES = 1024 * 1024;

async function shrink(uri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  for (const compress of QUALITIES) {
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress });
    if (new File(result.uri).size <= MAX_BYTES) {
      return { uri: result.uri, width: result.width, height: result.height };
    }
  }
  throw new ApiError("That photo is too large. Try a smaller one.", 400);
}

function askForCamera() {
  Alert.alert("Allow camera access", "Turn on camera access for Revlog in Settings.", [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}

// `many` lets the library pick up to that many photos in one go; the camera
// always takes one.
async function launch(source: "camera" | "library", many = 1) {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
    ...(many > 1 && { allowsMultipleSelection: true, selectionLimit: many, orderedSelection: true }),
  };
  if (source === "library") return ImagePicker.launchImageLibraryAsync(options);
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    askForCamera();
    return null;
  }
  return ImagePicker.launchCameraAsync(options);
}

function chooseSource(many = false) {
  return new Promise<"camera" | "library" | null>((resolve) => {
    Alert.alert(many ? "Add photos" : "Add a photo", undefined, [
      { text: "Take photo", onPress: () => resolve("camera") },
      { text: "Choose from library", onPress: () => resolve("library") },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

export type ChosenPhoto = { uri: string; width: number; height: number; form: FormData };

// Expo's fetch reads any part with bytes() and refuses React Native's { uri }
// form. The type is set here because the server only accepts known types.
export function fileForm(
  uri: string,
  type: string,
  name: string,
  fields: Record<string, string> = {},
  field = "file",
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const file = new File(uri);
  const part = { name, type, bytes: () => file.bytes() };
  form.append(field, part as unknown as Blob);
  return form;
}

// A form holding an already-chosen photo, which can be sent again.
export const photoForm = (uri: string, fields: Record<string, string> = {}, field = "photo") =>
  fileForm(uri, "image/jpeg", "photo.jpg", fields, field);

// Lets the owner pick a photo and returns it, ready to upload, or null.
export async function choosePhoto(fields: Record<string, string> = {}): Promise<ChosenPhoto | null> {
  const source = await chooseSource();
  if (!source) return null;
  const result = await launch(source);
  if (!result || result.canceled) return null;
  // Crop and rotate before it's used; cancelling picks nothing.
  const [photo] = (await editPhotos([sizeOf(result.assets[0])])) ?? [];
  if (!photo) return null;
  return ready(photo, fields);
}

const sizeOf = (asset: ImagePicker.ImagePickerAsset): EditablePhoto => ({
  uri: asset.uri,
  width: asset.width,
  height: asset.height,
});

// Shrinks a photo under the upload limit and wraps it in a form.
async function ready(photo: EditablePhoto, fields: Record<string, string>): Promise<ChosenPhoto> {
  const small = await shrink(photo.uri, photo.width, photo.height);
  return { ...small, form: photoForm(small.uri, fields) };
}

// Opens a photo that's already chosen or saved in the crop and rotate editor.
// Resolves with the edited copy, ready to upload, or null if nothing changed.
export async function editPhoto(
  source: { uri: string; width?: number; height?: number } | { url: string },
  fields: Record<string, string> = {},
): Promise<ChosenPhoto | null> {
  let uri: string;
  if ("url" in source) {
    // Saved photos live online; edit a local copy.
    const file = new File(Paths.cache, `edit-${Date.now()}.jpg`);
    uri = (await File.downloadFileAsync(source.url, file)).uri;
  } else {
    uri = source.uri;
  }
  let { width, height } = "url" in source ? { width: 0, height: 0 } : source;
  if (!width || !height) {
    const size = await ImageManipulator.manipulate(uri).renderAsync();
    width = size.width;
    height = size.height;
  }
  const [photo] = (await editPhotos([{ uri, width, height }], { done: "Save" })) ?? [];
  if (!photo || photo.uri === uri) return null;
  return ready(photo, fields);
}

// Lets the owner pick up to `limit` photos at once and returns them, ready to
// upload, in the order they were tapped. `onPicked` runs once the picker
// closes, so a screen can show it's working while the photos are shrunk.
export async function choosePhotos(
  limit: number,
  fields: Record<string, string> = {},
  onPicked?: (count: number) => void,
): Promise<ChosenPhoto[]> {
  if (limit < 1) return [];
  const source = await chooseSource(limit > 1);
  if (!source) return [];
  const result = await launch(source, limit);
  if (!result || result.canceled) return [];
  // Crop and rotate before they're used; cancelling picks nothing.
  const edited = await editPhotos(result.assets.slice(0, limit).map(sizeOf));
  if (!edited || edited.length === 0) return [];
  onPicked?.(edited.length);
  const chosen: ChosenPhoto[] = [];
  let tooLarge = 0;
  for (const photo of edited) {
    try {
      chosen.push(await ready(photo, fields));
    } catch {
      tooLarge++;
    }
  }
  if (tooLarge > 0) {
    Alert.alert(
      tooLarge === 1 ? "1 photo not added" : `${tooLarge} photos not added`,
      "They were too large. Try smaller ones.",
    );
  }
  return chosen;
}

export async function choosePhotoForm(fields: Record<string, string> = {}) {
  return (await choosePhoto(fields))?.form ?? null;
}
