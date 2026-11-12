import { Feather } from "@expo/vector-icons";
import type { GarageCar } from "@revlog/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  Body,
  Button,
  EmptyState,
  LoadFailed,
  Loading,
  Odometer,
  Screen,
  StatusPill,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import { colors, fonts, photoInk, photoInkMuted, radius, scrim, space } from "@/lib/theme";
import { registerForPush } from "@/lib/push";
import { useApi } from "@/lib/use-api";
import { updateWidgets } from "@/lib/widgets";

function CarPlate({ car, onOpen }: { car: GarageCar; onOpen: () => void }) {
  // Only work that's due earns a badge; "not logged" waits on the car page.
  const attention =
    car.urgency && (car.urgency.status === "overdue" || car.urgency.status === "due_soon")
      ? car.urgency
      : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={car.nickname ?? car.name}
      style={({ pressed }) => [styles.plate, pressed && styles.platePressed]}
      onPress={onOpen}
    >
      {car.photoUrl ? (
        <Image
          // The small copy; the full photo loads on the car's page.
          source={{
            uri: car.photoThumbUrl ?? car.photoUrl,
            cacheKey: car.photoThumbUrl ? `car-${car.id}-thumb` : `car-${car.id}`,
          }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.noPhoto}>
          <Feather name="camera" size={28} color={colors.edge} />
        </View>
      )}
      {car.photoUrl && <LinearGradient colors={scrim} style={styles.scrim} />}
      <View style={styles.badges}>
        {attention ? <StatusPill status={attention.status} count={attention.count} /> : <View />}
        {car.favorite && <Feather name="star" size={20} color={colors.amber} />}
      </View>
      <View style={styles.plateText}>
        <Text style={[styles.name, !!car.photoUrl && styles.onPhoto]} numberOfLines={1}>
          {car.nickname ?? car.name}
        </Text>
        {car.nickname && (
          <Text style={[styles.fullName, !!car.photoUrl && styles.onPhotoMuted]} numberOfLines={1}>
            {car.name}
          </Text>
        )}
        <Odometer miles={car.currentMileage} onPhoto={!!car.photoUrl} />
      </View>
    </Pressable>
  );
}

const GAP = space.lg;
const SETTLE = { duration: 180, easing: Easing.out(Easing.cubic) };

// The garage's cars. Tap one to open it; press and hold one, then drag it to
// a new spot. Favorites stay above the rest. The new order is handed back on drop.
function SortableCars({
  cars,
  onReorder,
}: {
  cars: GarageCar[];
  onReorder: (ids: string[]) => void;
}) {
  const [width, setWidth] = useState(0);
  // Each car's spot while dragging, by id.
  const order = useSharedValue<Record<string, number>>(
    Object.fromEntries(cars.map((c, i) => [c.id, i])),
  );
  const ids = cars.map((c) => c.id).join("|");
  useEffect(() => {
    order.set(Object.fromEntries(ids.split("|").map((id, i) => [id, i])));
  }, [ids, order]);

  // The spots a car can move within: its favorites group.
  const groups = cars.map((car) => {
    const spots = cars.flatMap((c, i) => (c.favorite === car.favorite ? [i] : []));
    return { lo: spots[0], hi: spots[spots.length - 1] };
  });

  const commit = (spots: Record<string, number>) =>
    onReorder([...cars].sort((a, b) => spots[a.id] - spots[b.id]).map((c) => c.id));

  const moveBy = (index: number, step: number) => {
    const { lo, hi } = groups[index];
    const to = Math.min(Math.max(index + step, lo), hi);
    if (to === index) return;
    const next = cars.map((c) => c.id);
    const [id] = next.splice(index, 1);
    next.splice(to, 0, id);
    onReorder(next);
  };

  const height = (width * 3) / 4;
  const step = height + GAP;

  return (
    <View
      style={{ height: width ? cars.length * step - GAP : 0 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 &&
        cars.map((car, i) => (
          <SortablePlate
            key={car.id}
            car={car}
            index={i}
            lo={groups[i].lo}
            hi={groups[i].hi}
            height={height}
            step={step}
            movable={groups[i].hi > groups[i].lo}
            order={order}
            onDrop={commit}
            onMoveBy={(by) => moveBy(i, by)}
          />
        ))}
    </View>
  );
}

function SortablePlate({
  car,
  index,
  lo,
  hi,
  height,
  step,
  movable,
  order,
  onDrop,
  onMoveBy,
}: {
  car: GarageCar;
  index: number;
  lo: number;
  hi: number;
  height: number;
  step: number;
  movable: boolean;
  order: SharedValue<Record<string, number>>;
  onDrop: (spots: Record<string, number>) => void;
  onMoveBy: (by: number) => void;
}) {
  const id = car.id;
  const y = useSharedValue(index * step);
  const dragging = useSharedValue(false);
  const from = useSharedValue(index);
  const originY = useSharedValue(0);
  // A drag ends with the finger lifting on the card; that isn't a tap.
  const dragged = useSharedValue(false);

  // Slides to its spot whenever the order changes, unless it's the one held.
  useAnimatedReaction(
    () => order.get()[id],
    (spot) => {
      if (spot === undefined || dragging.get()) return;
      y.set(withTiming(spot * step, SETTLE));
    },
    [step],
  );

  // Let go of the "was dragged" mark once the lift has been ignored, so the
  // next real tap opens the car.
  const settle = () => setTimeout(() => dragged.set(false), 350);

  const pan = Gesture.Pan()
    .enabled(movable)
    .activateAfterLongPress(300)
    .onStart(() => {
      dragging.set(true);
      from.set(order.get()[id] ?? index);
      originY.set(y.get());
      dragged.set(true);
      scheduleOnRN(pressFeedback);
    })
    .onUpdate((event) => {
      y.set(Math.min(Math.max(originY.get() + event.translationY, lo * step), hi * step));
      const target = Math.min(Math.max(Math.round(y.get() / step), lo), hi);
      const current = order.get();
      const here = current[id];
      if (target === here) return;
      const next: Record<string, number> = {};
      for (const k of Object.keys(current)) {
        const spot = current[k];
        if (k === id) next[k] = target;
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
      scheduleOnRN(settle);
      const spots = order.get();
      y.set(withTiming(spots[id] * step, SETTLE));
      if (spots[id] !== from.get()) scheduleOnRN(onDrop, spots);
    });

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }, { scale: withTiming(dragging.get() ? 1.03 : 1, SETTLE) }],
    zIndex: dragging.get() ? 10 : 0,
    shadowOpacity: withTiming(dragging.get() ? 0.45 : 0, SETTLE),
  }));

  const open = () => {
    if (dragged.get()) {
      dragged.set(false);
      return;
    }
    pressFeedback();
    router.push(`/car/${car.id}`);
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.slot, { height }, motion]}
        accessibilityActions={
          movable
            ? [
                { name: "up", label: "Move up" },
                { name: "down", label: "Move down" },
              ]
            : undefined
        }
        onAccessibilityAction={(event) => onMoveBy(event.nativeEvent.actionName === "up" ? -1 : 1)}
      >
        <CarPlate car={car} onOpen={open} />
      </Animated.View>
    </GestureDetector>
  );
}

// Asked once a car is in the garage, when reminders have something to say.
// iOS only shows the prompt once; after that this just refreshes the token.
let askedForPush = false;

export default function Garage() {
  const { data, error, reload } = useApi<GarageCar[]>("/vehicles");
  const [refreshing, setRefreshing] = useState(false);
  const hasCars = !!data?.length;
  useEffect(() => {
    if (!hasCars || askedForPush) return;
    askedForPush = true;
    registerForPush({ ask: true }).catch(() => undefined);
  }, [hasCars]);
  useEffect(() => {
    if (data) updateWidgets(data);
  }, [data]);
  // The dragged order, shown right away while it saves.
  const [order, setOrder] = useState<string[] | null>(null);

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const cars = order ? order.flatMap((id) => data.filter((c) => c.id === id)) : data;

  const reorder = async (ids: string[]) => {
    setOrder(ids);
    try {
      await api("/vehicles/order", { method: "PUT", body: { order: ids } });
      await reload();
    } catch (err) {
      Alert.alert("Order not saved", errorMessage(err));
    } finally {
      setOrder(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Costs"
                hitSlop={8}
                style={styles.headerButton}
                onPress={() => router.push("/costs")}
              >
                <Feather name="bar-chart-2" size={22} color={colors.amber} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a car"
                hitSlop={8}
                style={styles.headerButton}
                onPress={() => router.push("/add-car")}
              >
                <Feather name="plus" size={24} color={colors.amber} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Screen
        refreshControl={
          <RefreshControl
            tintColor={colors.amber}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        {data.length === 0 ? (
          <EmptyState
            title="Add your first car"
            body="Start a timeline of every service and mod for it."
            action={<Button label="Add a car" onPress={() => router.push("/add-car")} />}
          />
        ) : (
          <>
            <SortableCars cars={cars} onReorder={reorder} />
            {cars.length > 1 && (
              <Body style={styles.hint}>
                Press and hold a car to drag it into a new spot. Favorites stay at the top.
              </Body>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  slot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderRadius: radius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  plate: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.panel,
    justifyContent: "flex-end",
  },
  platePressed: { transform: [{ scale: 0.98 }] },
  noPhoto: { ...StyleSheet.absoluteFill, alignItems: "center", paddingTop: space.xxl * 2 },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" },
  badges: {
    position: "absolute",
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plateText: { padding: space.lg, gap: space.xs },
  name: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  fullName: { color: colors.label, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  onPhoto: { color: photoInk },
  onPhotoMuted: { color: photoInkMuted },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
