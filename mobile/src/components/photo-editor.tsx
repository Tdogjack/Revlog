import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { tapFeedback } from "@/lib/haptics";
import { colors, fonts, photoInk, photoInkMuted, radius, space } from "@/lib/theme";

// Crop and rotate photos before they're added. `editPhotos` opens the editor
// over whatever is on screen and resolves with the edited photos, or null if
// the person cancels. Untouched photos come back as they were.

export type EditablePhoto = { uri: string; width: number; height: number };
type Box = { x: number; y: number; w: number; h: number };
type Corner = "move" | "nw" | "ne" | "sw" | "se";
type Request = {
  photos: EditablePhoto[];
  done?: string;
  resolve: (photos: EditablePhoto[] | null) => void;
};

const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.08;
const HANDLE = 44;
const ASPECTS = [
  { label: "Free", value: 0 },
  { label: "4:3", value: 4 / 3 },
  { label: "Square", value: 1 },
];

// The open request. The editor is its own full-screen route, so it shows on
// top of anything, including screens that are themselves modal sheets.
let pending: Request | null = null;

export async function editPhotos(photos: EditablePhoto[], options: { done?: string } = {}) {
  if (photos.length === 0) return [];
  // One at a time; a second call while open leaves the photos as they are.
  if (pending) return photos;
  // iOS can't show a new screen while the photo picker is still closing.
  if (Platform.OS === "ios") await new Promise((resolve) => setTimeout(resolve, 450));
  return new Promise<EditablePhoto[] | null>((resolve) => {
    pending = { photos, done: options.done, resolve };
    router.push("/photo-editor");
  });
}

// The route's screen. Leaving it any way (Cancel, Done, or the system back
// gesture) settles the request.
export function PhotoEditorScreen() {
  const [request] = useState(() => pending);
  useEffect(() => {
    if (!request) router.back();
    return () => {
      if (pending === request && request) {
        request.resolve(null);
        pending = null;
      }
    };
  }, [request]);
  if (!request) return <View style={styles.root} />;
  return (
    <Editor
      request={request}
      onFinish={(photos) => {
        pending = null;
        request.resolve(photos);
        router.back();
      }}
    />
  );
}

type Item = { original: EditablePhoto; shown: EditablePhoto; rotation: number; box: Box };

const isEdited = (item: Item) =>
  item.rotation % 360 !== 0 ||
  item.box.x > 0.001 ||
  item.box.y > 0.001 ||
  item.box.w < 0.999 ||
  item.box.h < 0.999;

// The biggest box of this shape that fits, centered. 0 means any shape.
function fitAspect(aspect: number, width: number, height: number): Box {
  if (!aspect) return FULL;
  const imageAspect = width / height;
  if (imageAspect > aspect) {
    const w = aspect / imageAspect;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = imageAspect / aspect;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

async function save(context: ReturnType<typeof ImageManipulator.manipulate>) {
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  return { uri: result.uri, width: result.width, height: result.height };
}

async function render(item: Item): Promise<EditablePhoto> {
  if (!isEdited(item)) return item.original;
  const { shown, box } = item;
  const context = ImageManipulator.manipulate(shown.uri);
  const originX = Math.round(box.x * shown.width);
  const originY = Math.round(box.y * shown.height);
  context.crop({
    originX,
    originY,
    width: Math.min(shown.width - originX, Math.max(1, Math.round(box.w * shown.width))),
    height: Math.min(shown.height - originY, Math.max(1, Math.round(box.h * shown.height))),
  });
  return save(context);
}

function Editor({
  request,
  onFinish,
}: {
  request: Request;
  onFinish: (photos: EditablePhoto[] | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>(() =>
    request.photos.map((photo) => ({ original: photo, shown: photo, rotation: 0, box: FULL })),
  );
  const [current, setCurrent] = useState(0);
  const [aspect, setAspect] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const item = items[current];
  const many = items.length > 1;

  // The crop box lives in shared values while dragging, so it moves on the UI
  // thread; it's copied back to the item when the finger lifts.
  const bx = useSharedValue(item.box.x);
  const by = useSharedValue(item.box.y);
  const bw = useSharedValue(item.box.w);
  const bh = useSharedValue(item.box.h);
  const setBox = (box: Box) => {
    bx.set(box.x);
    by.set(box.y);
    bw.set(box.w);
    bh.set(box.h);
  };

  const update = (index: number, patch: Partial<Item>) =>
    setItems((all) => all.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const commitBox = (box: Box) => update(current, { box });

  // Where the photo sits on screen, fitted inside the stage.
  const scale =
    stage.width && item.shown.width
      ? Math.min(stage.width / item.shown.width, stage.height / item.shown.height)
      : 0;
  const shownWidth = item.shown.width * scale;
  const shownHeight = item.shown.height * scale;
  // Width over height of the crop box in fractions of the photo, for a locked shape.
  const ratio = aspect ? (aspect * item.shown.height) / item.shown.width : 0;

  const choose = (index: number) => {
    tapFeedback();
    setCurrent(index);
    setBox(items[index].box);
  };

  const rotate = async (step: number) => {
    tapFeedback();
    setBusy(true);
    try {
      const rotation = item.rotation + step;
      const turns = ((rotation % 360) + 360) % 360;
      const shown =
        turns === 0
          ? item.original
          : await save(ImageManipulator.manipulate(item.original.uri).rotate(turns));
      const box = fitAspect(aspect, shown.width, shown.height);
      update(current, { rotation, shown, box });
      setBox(box);
    } finally {
      setBusy(false);
    }
  };

  const chooseAspect = (value: number) => {
    tapFeedback();
    setAspect(value);
    const box = fitAspect(value, item.shown.width, item.shown.height);
    update(current, { box });
    setBox(box);
  };

  const reset = () => {
    tapFeedback();
    setAspect(0);
    update(current, { rotation: 0, shown: item.original, box: FULL });
    setBox(FULL);
  };

  const finish = async () => {
    tapFeedback();
    setBusy(true);
    try {
      const latest = items.map((it, i) =>
        i === current ? { ...it, box: { x: bx.get(), y: by.get(), w: bw.get(), h: bh.get() } } : it,
      );
      onFinish(await Promise.all(latest.map(render)));
    } catch {
      setBusy(false);
    }
  };

  const doneLabel = request.done ?? (many ? `Add ${items.length}` : "Use photo");

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={styles.barButton}
          onPress={() => onFinish(null)}
        >
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {many ? `Photo ${current + 1} of ${items.length}` : "Edit photo"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          hitSlop={8}
          style={[styles.barButton, styles.done]}
          onPress={busy ? undefined : finish}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAmber} />
          ) : (
            <Text style={styles.doneLabel}>{doneLabel}</Text>
          )}
        </Pressable>
      </View>

      <View
        style={styles.stage}
        onLayout={(e) =>
          setStage({
            width: e.nativeEvent.layout.width - space.lg * 2,
            height: e.nativeEvent.layout.height - space.lg * 2,
          })
        }
      >
        {scale > 0 && (
          <View style={{ width: shownWidth, height: shownHeight }}>
            <Image
              source={{ uri: item.shown.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="fill"
              accessibilityIgnoresInvertColors
            />
            <CropBox
              key={`${current}-${item.shown.uri}`}
              width={shownWidth}
              height={shownHeight}
              ratio={ratio}
              x={bx}
              y={by}
              w={bw}
              h={bh}
              onEnd={commitBox}
            />
          </View>
        )}
      </View>

      <View style={[styles.tools, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.toolRow}>
          <ToolButton icon="rotate-ccw" label="Rotate left" onPress={() => rotate(-90)} disabled={busy} />
          <ToolButton icon="rotate-cw" label="Rotate right" onPress={() => rotate(90)} disabled={busy} />
          <View style={styles.aspects} accessibilityRole="radiogroup">
            {ASPECTS.map((a) => {
              const on = aspect === a.value;
              return (
                <Pressable
                  key={a.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${a.label} crop`}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => chooseAspect(a.value)}
                >
                  <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !isEdited(item) }}
          style={styles.reset}
          onPress={isEdited(item) ? reset : undefined}
        >
          <Text style={[styles.resetLabel, !isEdited(item) && styles.resetOff]}>Reset</Text>
        </Pressable>
        {many && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbs}
          >
            {items.map((it, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityState={{ selected: i === current }}
                accessibilityLabel={`Photo ${i + 1}${isEdited(it) ? ", edited" : ""}`}
                onPress={() => choose(i)}
              >
                <Image
                  source={{ uri: it.shown.uri }}
                  style={[styles.thumb, i === current && styles.thumbOn]}
                  contentFit="cover"
                />
                {isEdited(it) && <View style={styles.editedDot} />}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.tool, pressed && styles.toolPressed]}
      onPress={disabled ? undefined : onPress}
    >
      <Feather name={icon} size={22} color={disabled ? photoInkMuted : photoInk} />
    </Pressable>
  );
}

const clamp = (v: number, lo: number, hi: number) => {
  "worklet";
  return Math.min(Math.max(v, lo), hi);
};

// Moves the box, or one corner of it, by (dx, dy) in fractions of the photo.
// With a locked shape, height follows width.
function moved(mode: Corner, start: Box, dx: number, dy: number, ratio: number): Box {
  "worklet";
  if (mode === "move") {
    return {
      ...start,
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
    };
  }
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const west = mode === "nw" || mode === "sw";
  const north = mode === "nw" || mode === "ne";
  let left = west ? clamp(start.x + dx, 0, right - MIN) : start.x;
  let top = north ? clamp(start.y + dy, 0, bottom - MIN) : start.y;
  let r = west ? right : clamp(right + dx, left + MIN, 1);
  let b = north ? bottom : clamp(bottom + dy, top + MIN, 1);
  if (ratio) {
    let w = r - left;
    let h = w / ratio;
    const maxH = north ? bottom : 1 - top;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    if (west) left = r - w;
    else r = left + w;
    if (north) top = b - h;
    else b = top + h;
  }
  return { x: left, y: top, w: r - left, h: b - top };
}

function CropBox({
  width,
  height,
  ratio,
  x,
  y,
  w,
  h,
  onEnd,
}: {
  width: number;
  height: number;
  ratio: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  w: SharedValue<number>;
  h: SharedValue<number>;
  onEnd: (box: Box) => void;
}) {
  const start = useSharedValue<Box>(FULL);

  const drag = (mode: Corner) =>
    Gesture.Pan()
      .minDistance(0)
      .onStart(() => {
        start.set({ x: x.get(), y: y.get(), w: w.get(), h: h.get() });
      })
      .onUpdate((event) => {
        const next = moved(mode, start.get(), event.translationX / width, event.translationY / height, ratio);
        x.set(next.x);
        y.set(next.y);
        w.set(next.w);
        h.set(next.h);
      })
      .onEnd(() => {
        scheduleOnRN(onEnd, { x: x.get(), y: y.get(), w: w.get(), h: h.get() });
      });

  const frame = useAnimatedStyle(() => ({
    left: x.get() * width,
    top: y.get() * height,
    width: w.get() * width,
    height: h.get() * height,
  }));
  // Darkens everything outside the box, in four strips.
  const above = useAnimatedStyle(() => ({ height: y.get() * height }));
  const below = useAnimatedStyle(() => ({ top: (y.get() + h.get()) * height }));
  const leftSide = useAnimatedStyle(() => ({
    top: y.get() * height,
    height: h.get() * height,
    width: x.get() * width,
  }));
  const rightSide = useAnimatedStyle(() => ({
    top: y.get() * height,
    height: h.get() * height,
    left: (x.get() + w.get()) * width,
  }));

  // The handles sit beside the box, not inside it, so a corner drag never
  // competes with moving the whole box.
  const nw = useAnimatedStyle(() => ({ left: x.get() * width - HANDLE / 2, top: y.get() * height - HANDLE / 2 }));
  const ne = useAnimatedStyle(() => ({
    left: (x.get() + w.get()) * width - HANDLE / 2,
    top: y.get() * height - HANDLE / 2,
  }));
  const sw = useAnimatedStyle(() => ({
    left: x.get() * width - HANDLE / 2,
    top: (y.get() + h.get()) * height - HANDLE / 2,
  }));
  const se = useAnimatedStyle(() => ({
    left: (x.get() + w.get()) * width - HANDLE / 2,
    top: (y.get() + h.get()) * height - HANDLE / 2,
  }));
  const corners = [
    { mode: "nw" as const, style: nw, label: "top left" },
    { mode: "ne" as const, style: ne, label: "top right" },
    { mode: "sw" as const, style: sw, label: "bottom left" },
    { mode: "se" as const, style: se, label: "bottom right" },
  ];

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.shade, styles.shadeTop, above]} />
      <Animated.View pointerEvents="none" style={[styles.shade, styles.shadeBottom, below]} />
      <Animated.View pointerEvents="none" style={[styles.shade, styles.shadeLeft, leftSide]} />
      <Animated.View pointerEvents="none" style={[styles.shade, styles.shadeRight, rightSide]} />
      <GestureDetector gesture={drag("move")}>
        <Animated.View
          style={[styles.box, frame]}
          accessible
          accessibilityLabel="Crop area. Drag to move it, or drag a corner to resize."
        >
          <View pointerEvents="none" style={styles.grid}>
            {[1, 2].map((n) => (
              <View key={`v${n}`} style={[styles.gridV, { left: `${(n * 100) / 3}%` }]} />
            ))}
            {[1, 2].map((n) => (
              <View key={`h${n}`} style={[styles.gridH, { top: `${(n * 100) / 3}%` }]} />
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
      {corners.map((c) => (
        <GestureDetector key={c.mode} gesture={drag(c.mode)}>
          <Animated.View
            style={[styles.handle, c.style]}
            accessible
            accessibilityLabel={`Resize from the ${c.label} corner`}
          >
            <View style={styles.handleDot} />
          </Animated.View>
        </GestureDetector>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  barButton: { minHeight: 44, minWidth: 64, justifyContent: "center" },
  cancel: { color: photoInk, fontFamily: fonts.medium, fontSize: 16 },
  title: {
    flex: 1,
    textAlign: "center",
    color: photoInk,
    fontFamily: fonts.medium,
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  done: {
    alignItems: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.amberFill,
  },
  doneLabel: { color: colors.onAmber, fontFamily: fonts.bold, fontSize: 15 },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg },
  shade: { position: "absolute", backgroundColor: "rgba(0,0,0,0.6)" },
  shadeTop: { left: 0, right: 0, top: 0 },
  shadeBottom: { left: 0, right: 0, bottom: 0 },
  shadeLeft: { left: 0 },
  shadeRight: { right: 0 },
  box: { position: "absolute", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  grid: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  gridV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  gridH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  handle: {
    position: "absolute",
    width: HANDLE,
    height: HANDLE,
    alignItems: "center",
    justifyContent: "center",
  },
  handleDot: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  tools: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
  toolRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  tool: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  toolPressed: { backgroundColor: "rgba(255,255,255,0.12)" },
  aspects: { flex: 1, flexDirection: "row", justifyContent: "flex-end", gap: space.xs },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { borderColor: colors.amber, backgroundColor: "rgba(255,255,255,0.08)" },
  chipLabel: { color: photoInkMuted, fontFamily: fonts.medium, fontSize: 14 },
  chipLabelOn: { color: photoInk },
  reset: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  resetLabel: { color: photoInk, fontFamily: fonts.medium, fontSize: 15 },
  resetOff: { color: "rgba(255,255,255,0.35)" },
  thumbs: { gap: space.sm, paddingVertical: space.xs },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbOn: { borderColor: colors.amber },
  editedDot: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.amber,
  },
});
