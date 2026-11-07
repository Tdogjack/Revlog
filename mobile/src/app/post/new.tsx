import type { CarDetail, CommunityOptions, GarageCar, Me } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Field, SelectField } from "@/components/fields";
import { PhotoChoice, PHOTO_CHOICE_SIZE } from "@/components/photo-choice";
import { Body, Button, EmptyState, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { choosePhoto, type ChosenPhoto } from "@/lib/photos";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const MAX_PHOTOS = 10;

type Shared = { vehicleId?: string; modId?: string; title?: string };

// A mod post offers that mod's photos first, then the rest of the build's.
const shareablePhotos = (car: CarDetail, modId?: string) => {
  const usable = car.photos.filter((p) => !p.recordId && (!modId || !p.modId || p.modId === modId));
  return modId
    ? [...usable.filter((p) => p.modId === modId), ...usable.filter((p) => p.modId !== modId)]
    : usable;
};

function GaragePhotos({
  carId,
  modId,
  picked,
  onToggle,
}: {
  carId: string;
  modId?: string;
  picked: string[];
  onToggle: (id: string) => void;
}) {
  const car = useApi<CarDetail>(`/vehicles/${carId}`);
  if (!car.data) return null;
  return shareablePhotos(car.data, modId).map((photo, i) => (
    <PhotoChoice
      key={photo.id}
      url={photo.url}
      chosen={picked.includes(photo.id)}
      label={`Garage photo ${i + 1}`}
      onPress={() => onToggle(photo.id)}
    />
  ));
}

export default function NewPost() {
  // Sharing a mod from its page starts with that car, mod, and its photos.
  const shared = useLocalSearchParams<Shared>();
  const sharedCar = useApi<CarDetail>(
    shared.modId && shared.vehicleId ? `/vehicles/${shared.vehicleId}` : null,
  );
  if (shared.modId && !sharedCar.data) {
    return sharedCar.error ? (
      <LoadFailed message={sharedCar.error} onRetry={sharedCar.reload} />
    ) : (
      <Loading />
    );
  }
  const modPhotos = sharedCar.data?.photos.filter((p) => p.modId === shared.modId) ?? [];
  return <PostForm shared={shared} initialPicked={modPhotos.map((p) => p.id)} />;
}

function PostForm({ shared, initialPicked }: { shared: Shared; initialPicked: string[] }) {
  const cars = useApi<GarageCar[]>("/vehicles");
  const options = useApi<CommunityOptions>("/community/options");
  const me = useApi<Me>("/me");
  const [vehicleId, setVehicleId] = useState(shared.vehicleId ?? "");
  const [tag, setTag] = useState(shared.modId ? "mod" : "progress");
  const [title, setTitle] = useState(shared.title ?? "");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<ChosenPhoto[]>([]);
  const [picked, setPicked] = useState(initialPicked.slice(0, MAX_PHOTOS));
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
  const full = photos.length + picked.length >= MAX_PHOTOS;
  const noRoom = () => Alert.alert("No room left", `Posts can have up to ${MAX_PHOTOS} photos.`);
  const togglePicked = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((p) => p !== id));
    else if (full) noRoom();
    else setPicked([...picked, id]);
  };

  const addPhoto = async () => {
    if (me.data && !me.data.emailVerified) {
      Alert.alert("Confirm your email", "Confirm your email to add photos. Resend the link from Account.");
      return;
    }
    if (full) {
      noRoom();
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
        body: { vehicleId: carId, modId: shared.modId, tag, title, body, photoIds: picked },
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
          // Photos belong to a car, so a new car starts with none chosen.
          if (value !== carId) setPicked([]);
        }}
      />
      <SelectField
        label="Type of post"
        value={tag}
        // The car's public build is posted from its car page.
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
          <Text style={styles.addLabel}>New photo</Text>
        </Pressable>
        {photos.map((photo, i) => (
          <PhotoChoice
            key={photo.uri}
            url={photo.uri}
            chosen
            label={`New photo ${i + 1}`}
            onPress={() => setPhotos((current) => current.filter((p) => p !== photo))}
          />
        ))}
        {carId && (
          <GaragePhotos
            carId={carId}
            modId={shared.modId}
            picked={picked}
            onToggle={togglePicked}
          />
        )}
      </ScrollView>
      <Body style={styles.hint}>
        Tap photos to choose them. {photos.length + picked.length} of {MAX_PHOTOS} chosen.
      </Body>
      <FormError message={error} />
      <Button label="Share post" busy={sharing} onPress={share} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photos: { gap: space.sm },
  add: {
    width: PHOTO_CHOICE_SIZE,
    height: PHOTO_CHOICE_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
