import { Feather } from "@expo/vector-icons";
import type { CarPhoto } from "@revlog/api";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { Body, Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { choosePhotoForm } from "@/lib/photos";
import { colors, fonts, space } from "@/lib/theme";

const THUMB = 104;

const hints = {
  build: "Keep a visual record of the build.",
  record: "Keep the receipt with the record.",
  mod: "Before and after, or the parts themselves.",
};

// Photos for a car, or for one service record or mod with `kind` and `targetId`.
export function PhotoStrip({
  carId,
  photos,
  limit,
  canUpload,
  kind = "record",
  targetId,
  canAdd = true,
  onChange,
}: {
  carId: string;
  photos: CarPhoto[];
  limit: number;
  canUpload: boolean;
  kind?: "record" | "mod";
  targetId?: string;
  // Off where photos are only shown, like an opened row on the car page.
  canAdd?: boolean;
  onChange: () => void;
}) {
  const [viewing, setViewing] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const add = async () => {
    if (!canUpload) {
      Alert.alert("Confirm your email", "Confirm your email to add photos. Resend the link from Account.");
      return;
    }
    if (photos.length >= limit) {
      Alert.alert("No room left", `You can add up to ${limit} photos here.`);
      return;
    }
    try {
      const form = await choosePhotoForm(
        targetId ? { kind, targetId } : { kind: "build" },
      );
      if (!form) return;
      setUploading(true);
      await api(`/vehicles/${carId}/photos`, { method: "POST", form });
      onChange();
    } catch (err) {
      Alert.alert("Photo not added", err instanceof Error ? errorMessage(err) : undefined);
    } finally {
      setUploading(false);
    }
  };

  const remove = (photo: { id: string }) => {
    Alert.alert("Delete this photo?", "This can't be undone.", [
      { text: "Keep photo", style: "cancel" },
      {
        text: "Delete photo",
        style: "destructive",
        onPress: async () => {
          setViewing(null);
          try {
            await api(`/vehicles/${carId}/photos/${photo.id}`, { method: "DELETE" });
            onChange();
          } catch (err) {
            Alert.alert("Photo not deleted", errorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {canAdd && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
            style={styles.add}
            onPress={uploading ? undefined : add}
          >
            {uploading ? (
              <ActivityIndicator color={colors.amber} />
            ) : (
              <>
                <Feather name="camera" size={22} color={colors.amber} />
                <Text style={styles.addLabel}>Add photo</Text>
              </>
            )}
          </Pressable>
        )}
        {photos.map((photo, i) => (
          <Pressable
            key={photo.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open photo ${i + 1} of ${photos.length}`}
            onPress={() => setViewing(i)}
          >
            <Image
              source={{ uri: photo.url, cacheKey: photo.id }}
              style={styles.thumb}
              contentFit="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      <PhotoViewer
        photos={photos}
        index={viewing}
        onClose={() => setViewing(null)}
        actions={(photo) => (
          <Button
            label="Delete photo"
            kind="danger"
            style={styles.viewerButton}
            onPress={() => remove(photo)}
          />
        )}
      />
      {canAdd && photos.length === 0 && (
        <Body style={styles.hint}>
          {hints[targetId ? kind : "build"]}
        </Body>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space.sm },
  add: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  addLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8, backgroundColor: colors.panel },
  viewerButton: { flex: 1 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
