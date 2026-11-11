import { Feather } from "@expo/vector-icons";
import type { CarPhoto } from "@revlog/api";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { PhotoViewer } from "@/components/photo-viewer";
import { Body, Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { choosePhotos, editPhoto } from "@/lib/photos";
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
  // "2 of 5" while a batch goes up.
  const [progress, setProgress] = useState<string | null>(null);

  const add = async () => {
    if (!canUpload) {
      Alert.alert(
        "Confirm your email",
        "Confirm your email to add photos. Resend the link from Account.",
      );
      return;
    }
    if (photos.length >= limit) {
      Alert.alert("No room left", `You can add up to ${limit} photos here.`);
      return;
    }
    try {
      const chosen = await choosePhotos(
        limit - photos.length,
        targetId ? { kind, targetId } : { kind: "build" },
        () => setUploading(true),
      );
      if (chosen.length === 0) return;
      setUploading(true);
      let failed = 0;
      for (const [i, photo] of chosen.entries()) {
        if (chosen.length > 1) setProgress(`${i + 1} of ${chosen.length}`);
        await api(`/vehicles/${carId}/photos`, { method: "POST", form: photo.form }).catch(
          () => failed++,
        );
      }
      onChange();
      if (failed > 0) {
        Alert.alert(
          failed === 1 ? "1 photo not added" : `${failed} photos not added`,
          "Check your connection and try those again.",
        );
      }
    } catch (err) {
      Alert.alert("Photos not added", err instanceof Error ? errorMessage(err) : undefined);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  // Crops or rotates a saved photo and saves it over the original.
  const recrop = async (photo: { id: string; url: string }) => {
    setViewing(null);
    try {
      const edited = await editPhoto({ url: photo.url });
      if (!edited) return;
      setUploading(true);
      await api(`/vehicles/${carId}/photos/${photo.id}`, { method: "PUT", form: edited.form });
      onChange();
    } catch (err) {
      Alert.alert("Photo not saved", errorMessage(err));
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {canAdd && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uploading ? "Adding photos" : "Add photos"}
            style={styles.add}
            onPress={uploading ? undefined : add}
          >
            {uploading ? (
              <>
                <ActivityIndicator color={colors.amber} />
                {progress && <Text style={styles.progress}>{progress}</Text>}
              </>
            ) : (
              <>
                <Feather name="camera" size={22} color={colors.amber} />
                <Text style={styles.addLabel}>Add photos</Text>
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
          <>
            <Button
              label="Crop"
              kind="secondary"
              style={styles.viewerButton}
              onPress={() => recrop(photo)}
            />
            <Button
              label="Delete photo"
              kind="danger"
              style={styles.viewerButton}
              onPress={() => remove(photo)}
            />
          </>
        )}
      />
      {canAdd && photos.length === 0 && (
        <Body style={styles.hint}>{hints[targetId ? kind : "build"]}</Body>
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
  progress: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8, backgroundColor: colors.panel },
  viewerButton: { flex: 1 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
