import { Feather } from "@expo/vector-icons";
import type { CarPhoto } from "@revlog/api";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  onChange,
}: {
  carId: string;
  photos: CarPhoto[];
  limit: number;
  canUpload: boolean;
  kind?: "record" | "mod";
  targetId?: string;
  onChange: () => void;
}) {
  const [viewing, setViewing] = useState<CarPhoto | null>(null);
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

  const remove = (photo: CarPhoto) => {
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
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            accessibilityRole="imagebutton"
            accessibilityLabel="Open photo"
            onPress={() => setViewing(photo)}
          >
            <Image
              source={{ uri: photo.url, cacheKey: photo.id }}
              style={styles.thumb}
              contentFit="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!viewing} animationType="fade" onRequestClose={() => setViewing(null)}>
        <SafeAreaView style={styles.viewer}>
          {viewing && (
            <Image
              source={{ uri: viewing.url, cacheKey: viewing.id }}
              style={styles.full}
              contentFit="contain"
              accessibilityLabel="Car photo"
            />
          )}
          <View style={styles.viewerActions}>
            <Button
              label="Close"
              kind="secondary"
              style={styles.viewerButton}
              onPress={() => setViewing(null)}
            />
            <Button
              label="Delete photo"
              kind="danger"
              style={styles.viewerButton}
              onPress={() => viewing && remove(viewing)}
            />
          </View>
        </SafeAreaView>
      </Modal>
      {photos.length === 0 && (
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
  viewer: { flex: 1, backgroundColor: "#000" },
  full: { flex: 1 },
  viewerActions: { flexDirection: "row", gap: space.md, padding: space.lg },
  viewerButton: { flex: 1 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
