import type { CommunityOptions, GarageCar, Me } from "@revlog/api";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Field, SelectField } from "@/components/fields";
import { Body, Button, EmptyState, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { choosePhoto, type ChosenPhoto } from "@/lib/photos";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const MAX_PHOTOS = 10;

export default function NewPost() {
  const cars = useApi<GarageCar[]>("/vehicles");
  const options = useApi<CommunityOptions>("/community/options");
  const me = useApi<Me>("/me");
  const [vehicleId, setVehicleId] = useState("");
  const [tag, setTag] = useState("progress");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<ChosenPhoto[]>([]);
  const [carError, setCarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  if (!cars.data || !options.data) {
    const message = cars.error ?? options.error;
    return message ? <LoadFailed message={message} onRetry={cars.reload} /> : <Loading />;
  }

  if (cars.data.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Add a car first"
          body="Posts are shared from a car in your garage."
          action={<Button label="Add a car" onPress={() => router.replace("/add-car")} />}
        />
      </Screen>
    );
  }

  const carId = vehicleId || (cars.data.length === 1 ? cars.data[0].id : "");

  const addPhoto = async () => {
    if (me.data && !me.data.emailVerified) {
      Alert.alert("Confirm your email", "Confirm your email to add photos. Resend the link from Account.");
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("No room left", `Posts can have up to ${MAX_PHOTOS} photos.`);
      return;
    }
    try {
      const photo = await choosePhoto();
      if (photo) setPhotos((current) => [...current, photo]);
    } catch (err) {
      Alert.alert("Photo not added", errorMessage(err));
    }
  };

  const share = async () => {
    if (!carId) {
      setCarError("Pick a car to share.");
      return;
    }
    setSharing(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/community/posts", {
        method: "POST",
        body: { vehicleId: carId, tag, title, body },
      });
      // The post is live now, so a failed photo doesn't lose it.
      let failed = 0;
      for (const photo of photos) {
        await api(`/community/posts/${id}/photos`, { method: "POST", form: photo.form }).catch(
          () => failed++,
        );
      }
      router.replace(`/post/${id}`);
      if (failed > 0) {
        Alert.alert("Post shared", `${failed} of your photos didn't upload.`);
      }
    } catch (err) {
      setSharing(false);
      if (err instanceof ApiError && err.status === 409) router.push("/username");
      else setError(errorMessage(err));
    }
  };

  return (
    <Screen>
      <SelectField
        label="Car"
        value={carId}
        error={carError}
        options={cars.data.map((car) => ({ value: car.id, label: car.nickname ?? car.name }))}
        onChange={(value) => {
          setCarError(null);
          setVehicleId(value);
        }}
      />
      <SelectField
        label="Type of post"
        value={tag}
        // The car's public build is shared from the website.
        options={options.data.tags.filter((t) => t.value !== "build")}
        onChange={setTag}
      />
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
          style={styles.add}
          onPress={addPhoto}
        >
          <Text style={styles.addLabel}>Add photo</Text>
        </Pressable>
        {photos.map((photo, i) => (
          <Pressable
            key={photo.uri}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Remove photo ${i + 1}`}
            onPress={() => setPhotos((current) => current.filter((p) => p !== photo))}
          >
            <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      {photos.length > 0 && <Body style={styles.hint}>Tap a photo to remove it.</Body>}
      <FormError message={error} />
      <Button label="Share post" busy={sharing} onPress={share} />
    </Screen>
  );
}

const THUMB = 84;

const styles = StyleSheet.create({
  photos: { gap: space.sm },
  add: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 13 },
  thumb: { width: THUMB, height: THUMB, borderRadius: 8, backgroundColor: colors.panel },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
