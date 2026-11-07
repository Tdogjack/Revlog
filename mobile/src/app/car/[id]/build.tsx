import { Feather } from "@expo/vector-icons";
import type { BuildDraft, CarDetail } from "@revlog/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { PhotoChoice, PHOTO_CHOICE_SIZE } from "@/components/photo-choice";
import { Body, Button, FormError, Heading, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { choosePhoto, type ChosenPhoto } from "@/lib/photos";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function BuildForm({ carId, draft, canUpload }: { carId: string; draft: BuildDraft; canUpload: boolean }) {
  const updating = !!draft.post;
  const [title, setTitle] = useState(draft.post?.title ?? draft.defaultTitle);
  const [body, setBody] = useState(draft.post?.body ?? "");
  const [showParts, setShowParts] = useState(draft.post?.showParts ?? draft.partCount > 0);
  const [keep, setKeep] = useState(draft.post?.photos.map((p) => p.id) ?? []);
  const [picked, setPicked] = useState<string[]>([]);
  const [added, setAdded] = useState<ChosenPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const count = keep.length + picked.length + added.length;
  const full = count >= draft.maxPhotos;
  const noRoom = () =>
    Alert.alert("No room left", `Builds can have up to ${draft.maxPhotos} photos.`);
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const addPhoto = async () => {
    if (!canUpload) {
      Alert.alert("Confirm your email", "Confirm your email to add photos. Resend the link from Account.");
      return;
    }
    if (full) {
      noRoom();
      return;
    }
    try {
      const photo = await choosePhoto();
      if (photo) setAdded((current) => [...current, photo]);
    } catch (err) {
      Alert.alert("Photo not added", errorMessage(err));
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/community/build", {
        method: "PUT",
        body: { vehicleId: carId, title, body, showParts, photoIds: picked, keepPhotoIds: keep },
      });
      // The build is live now, so a failed photo doesn't lose it.
      let failed = 0;
      for (const photo of added) {
        await api(`/community/posts/${id}/photos`, { method: "POST", form: photo.form }).catch(
          () => failed++,
        );
      }
      router.replace(`/post/${id}`);
      if (failed > 0) Alert.alert("Build saved", `${failed} of your photos didn't upload.`);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.status === 409) router.push("/username");
      else setError(errorMessage(err));
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: updating ? "Update public build" : "Post public build" }} />
      <Body style={styles.muted}>
        {updating
          ? "Changes show on your build post right away."
          : "Each car gets one public build that you keep up to date from your garage."}
      </Body>
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        validate={(v) => (v.trim() ? null : "Give your build a title.")}
      />
      <Field label="Story (optional)" value={body} onChangeText={setBody} multiline maxLength={4000} />
      {draft.partCount > 0 && (
        <View style={styles.toggle}>
          <Text style={styles.toggleLabel}>
            Show {draft.partCount} {draft.partCount === 1 ? "part" : "parts"} from your installed mods
          </Text>
          <Switch
            accessibilityLabel="Show parts on the build"
            value={showParts}
            trackColor={{ true: colors.amber, false: colors.graphite }}
            onValueChange={setShowParts}
          />
        </View>
      )}

      <Heading>Photos</Heading>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a new photo"
          style={styles.add}
          onPress={addPhoto}
        >
          <Feather name="camera" size={22} color={colors.amber} />
          <Text style={styles.addLabel}>New photo</Text>
        </Pressable>
        {draft.post?.photos.map((photo, i) => (
          <PhotoChoice
            key={photo.id}
            url={photo.url}
            chosen={keep.includes(photo.id)}
            label={`Build photo ${i + 1}`}
            onPress={() => {
              if (!keep.includes(photo.id) && full) noRoom();
              else setKeep(toggle(keep, photo.id));
            }}
          />
        ))}
        {added.map((photo, i) => (
          <PhotoChoice
            key={photo.uri}
            url={photo.uri}
            chosen
            label={`New photo ${i + 1}`}
            onPress={() => setAdded((current) => current.filter((p) => p !== photo))}
          />
        ))}
        {draft.gallery.map((photo, i) => (
          <PhotoChoice
            key={photo.id}
            url={photo.url}
            chosen={picked.includes(photo.id)}
            label={`Garage photo ${i + 1}`}
            onPress={() => {
              if (!picked.includes(photo.id) && full) noRoom();
              else setPicked(toggle(picked, photo.id));
            }}
          />
        ))}
      </ScrollView>
      <Body style={styles.hint}>
        Tap photos to choose them. {count} of {draft.maxPhotos} chosen.
      </Body>

      <FormError message={error} />
      <Button label={updating ? "Update build" : "Post build"} busy={saving} onPress={save} />
    </Screen>
  );
}

export default function PublicBuild() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const draft = useApi<BuildDraft>(`/community/build?vehicleId=${id}`);
  const car = useApi<CarDetail>(`/vehicles/${id}`);

  if (!draft.data || !car.data) {
    const message = draft.error ?? car.error;
    return message ? <LoadFailed message={message} onRetry={draft.reload} /> : <Loading />;
  }
  return <BuildForm carId={id} draft={draft.data} canUpload={car.data.canUpload} />;
}

const styles = StyleSheet.create({
  muted: { color: colors.steel },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 },
  toggleLabel: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  photos: { gap: space.sm },
  add: {
    width: PHOTO_CHOICE_SIZE,
    height: PHOTO_CHOICE_SIZE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  addLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
