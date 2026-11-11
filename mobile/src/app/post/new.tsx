import type { CarDetail, CommunityOptions, GarageCar, Me, SavedPost } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Field, SelectField } from "@/components/fields";
import {
  entryIds,
  PostPhotos,
  postEntry,
  savePostPhotos,
  shareablePhotos,
  type PostEntry,
} from "@/components/post-photos";
import { Button, EmptyState, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const MAX_PHOTOS = 10;

type Shared = { vehicleId?: string; modId?: string; title?: string };

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
  return (
    <PostForm
      shared={shared}
      initial={modPhotos.slice(0, MAX_PHOTOS).map((p) => postEntry("garage", p))}
    />
  );
}

function PostForm({ shared, initial }: { shared: Shared; initial: PostEntry[] }) {
  const cars = useApi<GarageCar[]>("/vehicles");
  const options = useApi<CommunityOptions>("/community/options");
  const me = useApi<Me>("/me");
  const [vehicleId, setVehicleId] = useState(shared.vehicleId ?? "");
  const [tag, setTag] = useState(shared.modId ? "mod" : "progress");
  const [title, setTitle] = useState(shared.title ?? "");
  const [body, setBody] = useState("");
  const [entries, setEntries] = useState(initial);
  const [carError, setCarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const onlyCar = cars.data?.length === 1 ? cars.data[0].id : "";
  const carId = vehicleId || onlyCar;
  const car = useApi<CarDetail>(carId ? `/vehicles/${carId}` : null);

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

  const share = async () => {
    if (!carId) {
      setCarError("Pick a car to share.");
      return;
    }
    setSharing(true);
    setError(null);
    try {
      const saved = await api<SavedPost>("/community/posts", {
        method: "POST",
        body: { vehicleId: carId, modId: shared.modId, tag, title, body, ...entryIds(entries) },
      });
      // The post is live now, so a failed photo doesn't lose it.
      const failed = await savePostPhotos(saved, entries);
      router.replace(`/post/${saved.id}`);
      if (failed > 0) Alert.alert("Post shared", `${failed} of your photos didn't upload.`);
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
        options={cars.data.map((c) => ({ value: c.id, label: c.nickname ?? c.name }))}
        onChange={(value) => {
          setCarError(null);
          setVehicleId(value);
          // Garage photos belong to a car, so a new car drops the old car's.
          if (value !== carId) setEntries((current) => current.filter((e) => e.kind === "upload"));
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
      <PostPhotos
        entries={entries}
        onChange={setEntries}
        max={MAX_PHOTOS}
        garage={car.data ? shareablePhotos(car.data, shared.modId) : []}
        canUpload={!me.data || me.data.emailVerified}
      />
      <FormError message={error} />
      <Button label="Share post" busy={sharing} onPress={share} />
    </Screen>
  );
}
