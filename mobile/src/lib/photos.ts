import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";
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
    if (new File(result.uri).size <= MAX_BYTES) return result.uri;
  }
  throw new ApiError("That photo is too large. Try a smaller one.", 400);
}

function askForCamera() {
  Alert.alert("Allow camera access", "Turn on camera access for Revlog in Settings.", [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}

async function launch(source: "camera" | "library") {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  if (source === "library") return ImagePicker.launchImageLibraryAsync(options);
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    askForCamera();
    return null;
  }
  return ImagePicker.launchCameraAsync(options);
}

function chooseSource() {
  return new Promise<"camera" | "library" | null>((resolve) => {
    Alert.alert("Add a photo", undefined, [
      { text: "Take photo", onPress: () => resolve("camera") },
      { text: "Choose from library", onPress: () => resolve("library") },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}

// Lets the owner pick a photo and returns a form ready to upload, or null.
export async function choosePhotoForm(fields: Record<string, string> = {}) {
  const source = await chooseSource();
  if (!source) return null;
  const result = await launch(source);
  if (!result || result.canceled) return null;
  const asset = result.assets[0];
  const uri = await shrink(asset.uri, asset.width, asset.height);

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  // Expo's fetch reads any part with bytes() and refuses React Native's { uri }
  // form. The type is set here because the server only accepts image types.
  const file = new File(uri);
  const part = { name: "photo.jpg", type: "image/jpeg", bytes: () => file.bytes() };
  form.append("photo", part as unknown as Blob);
  return form;
}
