import type { BuildDraft, CarDetail, SavedPost } from "@revlog/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { entryIds, PostPhotos, postEntry, savePostPhotos } from "@/components/post-photos";
import { Body, Button, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function BuildForm({ carId, draft, canUpload }: { carId: string; draft: BuildDraft; canUpload: boolean }) {
  const updating = !!draft.post;
  const [title, setTitle] = useState(draft.post?.title ?? draft.defaultTitle);
  const [body, setBody] = useState(draft.post?.body ?? "");
  const [showParts, setShowParts] = useState(draft.post?.showParts ?? draft.partCount > 0);
  // An update starts with the build's photos, in their order.
  const [entries, setEntries] = useState(() =>
    (draft.post?.photos ?? []).map((p) => postEntry("post", p)),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await api<SavedPost>("/community/build", {
        method: "PUT",
        body: { vehicleId: carId, title, body, showParts, ...entryIds(entries) },
      });
      // The build is live now, so a failed photo doesn't lose it.
      const failed = await savePostPhotos(saved, entries);
      router.replace(`/post/${saved.id}`);
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

      <PostPhotos
        entries={entries}
        onChange={setEntries}
        max={draft.maxPhotos}
        garage={draft.gallery}
        canUpload={canUpload}
      />

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
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 },
  toggleLabel: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
});
