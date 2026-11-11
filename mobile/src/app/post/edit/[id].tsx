import type { CarDetail, CommunityOptions, Me, PostDetail, SavedPost } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { Field, SelectField } from "@/components/fields";
import {
  entryIds,
  PostPhotos,
  postEntry,
  savePostPhotos,
  shareablePhotos,
} from "@/components/post-photos";
import { Button, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const MAX_PHOTOS = 10;

// Edits one of your own posts: its words, tag, part links, and photos.
export default function EditPost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useApi<PostDetail>(`/community/posts/${id}`);
  const options = useApi<CommunityOptions>("/community/options");
  const me = useApi<Me>("/me");
  const car = useApi<CarDetail>(detail.data ? `/vehicles/${detail.data.post.vehicleId}` : null);

  if (!detail.data || !options.data) {
    const message = detail.error ?? options.error;
    return message ? <LoadFailed message={message} onRetry={detail.reload} /> : <Loading />;
  }
  return (
    <EditForm
      post={detail.data.post}
      tags={options.data.tags.filter((t) => t.value !== "build")}
      garage={car.data ? shareablePhotos(car.data, detail.data.post.modId) : []}
      canUpload={!me.data || me.data.emailVerified}
    />
  );
}

function EditForm({
  post,
  tags,
  garage,
  canUpload,
}: {
  post: PostDetail["post"];
  tags: CommunityOptions["tags"];
  garage: { id: string; url: string }[];
  canUpload: boolean;
}) {
  const [tag, setTag] = useState(post.tag);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body ?? "");
  const [showParts, setShowParts] = useState(post.showParts);
  const [entries, setEntries] = useState(() => post.photos.map((p) => postEntry("post", p)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await api<SavedPost>(`/community/posts/${post.id}`, {
        method: "PATCH",
        body: { title, body, tag, showParts, ...entryIds(entries) },
      });
      const failed = await savePostPhotos(saved, entries);
      router.back();
      if (failed > 0) Alert.alert("Post saved", `${failed} of your photos didn't upload.`);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiError && err.status === 409) router.push("/username");
      else setError(errorMessage(err));
    }
  };

  return (
    <Screen>
      <SelectField label="Type of post" value={tag} options={tags} onChange={setTag} />
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        validate={(v) => (v.trim() ? null : "Give your post a title.")}
      />
      <Field
        label="Story (optional)"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={4000}
      />
      <View style={styles.toggle}>
        <Text style={styles.toggleLabel}>
          Show part links from {post.modId ? "this mod" : "your installed mods"}
        </Text>
        <Switch
          accessibilityLabel="Show part links on the post"
          value={showParts}
          trackColor={{ true: colors.amber, false: colors.graphite }}
          onValueChange={setShowParts}
        />
      </View>
      <PostPhotos
        entries={entries}
        onChange={setEntries}
        max={MAX_PHOTOS}
        garage={garage}
        canUpload={canUpload}
      />
      <FormError message={error} />
      <Button label="Save changes" busy={saving} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 },
  toggleLabel: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
});
