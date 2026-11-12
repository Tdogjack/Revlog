import { Feather } from "@expo/vector-icons";
import type { CarDetail, SavedPost } from "@revlog/api";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PhotoChoice } from "@/components/photo-choice";
import { Body, Heading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import { choosePhotos, editPhoto, type ChosenPhoto } from "@/lib/photos";
import { colors, fonts, radius, space, springs } from "@/lib/theme";

// One photo in a post, in the order it'll show: already on the post, picked
// from the garage, or new for this post.
export type PostEntry =
  | { key: string; kind: "post"; id: string; url: string; thumb?: string }
  | { key: string; kind: "garage"; id: string; url: string; thumb?: string }
  | { key: string; kind: "upload"; photo: ChosenPhoto };

let nextKey = 0;
const newKey = () => `photo-${nextKey++}`;

export const postEntry = (
  kind: "post" | "garage",
  photo: { id: string; url: string; thumbUrl?: string },
): PostEntry => ({
  key: newKey(),
  kind,
  id: photo.id,
  url: photo.url,
  thumb: photo.thumbUrl,
});

// A mod post offers that mod's photos first, then the rest of the build's.
// Receipts are never offered.
export const shareablePhotos = (car: CarDetail, modId?: string | null) => {
  const usable = car.photos.filter((p) => !p.recordId && (!modId || !p.modId || p.modId === modId));
  return modId
    ? [...usable.filter((p) => p.modId === modId), ...usable.filter((p) => p.modId !== modId)]
    : usable;
};

// Grids show the small copy when there is one; cropping always starts from the full photo.
const urlOf = (entry: PostEntry) =>
  entry.kind === "upload" ? entry.photo.uri : (entry.thumb ?? entry.url);

// What a saved post needs to send: garage photos to copy, and photos it keeps.
export const entryIds = (entries: PostEntry[]) => ({
  photoIds: entries.flatMap((e) => (e.kind === "garage" ? [e.id] : [])),
  keepPhotoIds: entries.flatMap((e) => (e.kind === "post" ? [e.id] : [])),
});

// After the post itself is saved: uploads the new photos, then puts every
// photo in the order shown. Returns how many uploads failed.
export async function savePostPhotos(saved: SavedPost, entries: PostEntry[]) {
  const uploaded: Record<string, string> = {};
  let failed = 0;
  for (const entry of entries) {
    if (entry.kind !== "upload") continue;
    try {
      const { id } = await api<{ id: string }>(`/community/posts/${saved.id}/photos`, {
        method: "POST",
        form: entry.photo.form,
      });
      uploaded[entry.key] = id;
    } catch {
      failed++;
    }
  }
  const order = entries.flatMap((e) => {
    const id = e.kind === "post" ? e.id : e.kind === "garage" ? saved.added[e.id] : uploaded[e.key];
    return id ? [id] : [];
  });
  if (order.length > 1) {
    await api(`/community/posts/${saved.id}/photos`, {
      method: "PUT",
      body: { order },
    }).catch(() => {});
  }
  return failed;
}

// The post's photos in a grid, in order. Press and hold a photo, then drag it
// to any spot. Each photo has buttons to crop and remove it; new photos and
// garage photos are added below.
export function PostPhotos({
  entries,
  onChange,
  max,
  garage,
  canUpload,
}: {
  entries: PostEntry[];
  onChange: (entries: PostEntry[]) => void;
  max: number;
  garage: { id: string; url: string; thumbUrl?: string }[];
  canUpload: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const room = max - entries.length;
  const noRoom = () => Alert.alert("No room left", `Posts can have up to ${max} photos.`);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= entries.length || from === to) return;
    const next = [...entries];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry);
    onChange(next);
  };

  const remove = (key: string) => {
    tapFeedback();
    onChange(entries.filter((e) => e.key !== key));
  };

  const toggleGarage = (photo: { id: string; url: string }) => {
    const inPost = entries.find((e) => e.kind === "garage" && e.id === photo.id);
    if (inPost) remove(inPost.key);
    else if (room <= 0) noRoom();
    else onChange([...entries, postEntry("garage", photo)]);
  };

  const confirmEmail = () =>
    Alert.alert(
      "Confirm your email",
      "Confirm your email to add photos. Resend the link from Account.",
    );

  const add = async () => {
    if (!canUpload) return confirmEmail();
    if (room <= 0) return noRoom();
    try {
      const chosen = await choosePhotos(room, {}, () => setBusy(true));
      if (chosen.length > 0) {
        onChange([
          ...entries,
          ...chosen.map((photo) => ({
            key: newKey(),
            kind: "upload" as const,
            photo,
          })),
        ]);
      }
    } catch (err) {
      Alert.alert("Photos not added", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Cropping any photo makes an edited copy for this post, in the same spot.
  // Garage originals are left as they are.
  const crop = async (entry: PostEntry) => {
    if (!canUpload && entry.kind !== "upload") return confirmEmail();
    try {
      const edited = await editPhoto(
        entry.kind === "upload"
          ? {
              uri: entry.photo.uri,
              width: entry.photo.width,
              height: entry.photo.height,
            }
          : { url: entry.url },
      );
      if (!edited) return;
      onChange(
        entries.map((e) =>
          e.key === entry.key ? { key: newKey(), kind: "upload", photo: edited } : e,
        ),
      );
    } catch (err) {
      Alert.alert("Photo not changed", errorMessage(err));
    }
  };

  const size = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const cells = entries.length + (room > 0 ? 1 : 0);
  const rows = Math.max(1, Math.ceil(cells / COLUMNS));

  return (
    <View style={styles.section}>
      <Heading>Photos</Heading>
      <Body style={styles.hint}>
        {entries.length} of {max}. The first photo leads the post. Press and hold a photo, then drag
        it to change the order.
      </Body>
      <View
        style={{ height: size ? rows * size + (rows - 1) * GAP : 0 }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {size > 0 && (
          <SortableGrid
            entries={entries}
            size={size}
            onMove={move}
            onCrop={crop}
            onRemove={remove}
          />
        )}
        {size > 0 && room > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={busy ? "Adding photos" : "Add photos"}
            style={[
              styles.add,
              {
                width: size,
                height: size,
                left: (entries.length % COLUMNS) * (size + GAP),
                top: Math.floor(entries.length / COLUMNS) * (size + GAP),
              },
            ]}
            onPress={busy ? undefined : add}
          >
            {busy ? (
              <ActivityIndicator color={colors.amber} />
            ) : (
              <>
                <Feather name="camera" size={22} color={colors.amber} />
                <Text style={styles.addLabel}>Add photos</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {garage.length > 0 && (
        <>
          <Text style={styles.label}>From your garage</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {garage.map((photo, i) => (
              <PhotoChoice
                key={photo.id}
                url={photo.thumbUrl ?? photo.url}
                chosen={entries.some((e) => e.kind === "garage" && e.id === photo.id)}
                label={`Garage photo ${i + 1}`}
                onPress={() => toggleGarage(photo)}
              />
            ))}
          </ScrollView>
          <Body style={styles.hint}>
            Cropping a garage photo here changes only the post&apos;s copy.
          </Body>
        </>
      )}
    </View>
  );
}

const COLUMNS = 3;
const GAP = space.sm;

// Where the photo at `index` sits in the grid.
const slot = (index: number, size: number) => {
  "worklet";
  return {
    x: (index % COLUMNS) * (size + GAP),
    y: Math.floor(index / COLUMNS) * (size + GAP),
  };
};

// The tiles sit at their slots; while one is dragged, the others slide to make
// room under it, and the new order is handed back when it's dropped.
function SortableGrid({
  entries,
  size,
  onMove,
  onCrop,
  onRemove,
}: {
  entries: PostEntry[];
  size: number;
  onMove: (from: number, to: number) => void;
  onCrop: (entry: PostEntry) => void;
  onRemove: (key: string) => void;
}) {
  // Each photo's spot while dragging, by key.
  const order = useSharedValue<Record<string, number>>(
    Object.fromEntries(entries.map((e, i) => [e.key, i])),
  );
  const keys = entries.map((e) => e.key).join("|");
  useEffect(() => {
    order.set(Object.fromEntries(keys.split("|").map((key, i) => [key, i])));
  }, [keys, order]);

  return entries.map((entry, i) => (
    <SortableTile
      key={entry.key}
      entry={entry}
      index={i}
      count={entries.length}
      size={size}
      order={order}
      onMove={onMove}
      onCrop={onCrop}
      onRemove={onRemove}
    />
  ));
}

function SortableTile({
  entry,
  index,
  count,
  size,
  order,
  onMove,
  onCrop,
  onRemove,
}: {
  entry: PostEntry;
  index: number;
  count: number;
  size: number;
  order: SharedValue<Record<string, number>>;
  onMove: (from: number, to: number) => void;
  onCrop: (entry: PostEntry) => void;
  onRemove: (key: string) => void;
}) {
  const key = entry.key;
  const start = slot(index, size);
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const dragging = useSharedValue(false);
  const from = useSharedValue(index);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  // Slides to its spot whenever the order changes, unless it's the one held.
  useAnimatedReaction(
    () => order.get()[key],
    (spot) => {
      if (spot === undefined || dragging.get()) return;
      const to = slot(spot, size);
      x.set(withSpring(to.x, springs.settle));
      y.set(withSpring(to.y, springs.settle));
    },
    [size],
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      dragging.set(true);
      from.set(order.get()[key] ?? index);
      originX.set(x.get());
      originY.set(y.get());
      scheduleOnRN(pressFeedback);
    })
    .onUpdate((event) => {
      x.set(originX.get() + event.translationX);
      y.set(originY.get() + event.translationY);
      // The spot under the middle of the photo.
      const col = Math.min(Math.max(Math.round(x.get() / (size + GAP)), 0), COLUMNS - 1);
      const row = Math.max(Math.round(y.get() / (size + GAP)), 0);
      const target = Math.min(row * COLUMNS + col, count - 1);
      const current = order.get();
      const here = current[key];
      if (target === here) return;
      const next: Record<string, number> = {};
      for (const k of Object.keys(current)) {
        const spot = current[k];
        if (k === key) next[k] = target;
        else if (here < target && spot > here && spot <= target) next[k] = spot - 1;
        else if (here > target && spot >= target && spot < here) next[k] = spot + 1;
        else next[k] = spot;
      }
      order.set(next);
      scheduleOnRN(tapFeedback);
    })
    .onFinalize(() => {
      if (!dragging.get()) return;
      dragging.set(false);
      const to = order.get()[key];
      const home = slot(to, size);
      x.set(withSpring(home.x, springs.settle));
      y.set(withSpring(home.y, springs.settle));
      if (to !== from.get()) scheduleOnRN(onMove, from.get(), to);
    });

  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: withSpring(dragging.get() ? 1.06 : 1, springs.settle) },
    ],
    zIndex: dragging.get() ? 10 : 0,
    shadowOpacity: withSpring(dragging.get() ? 0.35 : 0, springs.settle),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.tile, { width: size, height: size }, motion]}
        accessible
        accessibilityLabel={`Photo ${index + 1} of ${count}`}
        accessibilityHint="Press and hold, then drag to move it."
        accessibilityActions={[
          { name: "earlier", label: "Move earlier" },
          { name: "later", label: "Move later" },
          { name: "crop", label: "Crop or rotate" },
          { name: "remove", label: "Remove" },
        ]}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === "earlier") onMove(index, Math.max(index - 1, 0));
          if (action === "later") onMove(index, Math.min(index + 1, count - 1));
          if (action === "crop") onCrop(entry);
          if (action === "remove") onRemove(key);
        }}
      >
        <Image source={{ uri: urlOf(entry) }} style={styles.photo} contentFit="cover" />
        <View style={styles.number} pointerEvents="none">
          <Text style={styles.numberLabel}>{index + 1}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove photo ${index + 1}`}
          hitSlop={8}
          style={[styles.corner, styles.removeCorner]}
          onPress={() => onRemove(key)}
        >
          <Feather name="x" size={16} color="#fff" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Crop or rotate photo ${index + 1}`}
          hitSlop={8}
          style={[styles.corner, styles.cropCorner]}
          onPress={() => onCrop(entry)}
        >
          <Feather name="crop" size={15} color="#fff" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  label: {
    color: colors.label,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: space.sm,
  },
  row: { gap: space.sm },
  tile: {
    position: "absolute",
    top: 0,
    left: 0,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  photo: { flex: 1, borderRadius: radius.md },
  number: {
    position: "absolute",
    top: space.xs,
    left: space.xs,
    minWidth: 24,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
  },
  numberLabel: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  removeCorner: { top: space.xs, right: space.xs },
  cropCorner: { bottom: space.xs, right: space.xs },
  add: {
    position: "absolute",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  addLabel: {
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});
