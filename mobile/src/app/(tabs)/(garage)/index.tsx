import { Feather } from "@expo/vector-icons";
import type { GarageCar } from "@revlog/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Button,
  EmptyState,
  ListGroup,
  ListRow,
  LoadFailed,
  Loading,
  Odometer,
  Screen,
  StatusPill,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import { colors, fonts, radius, scrim, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function CarPlate({ car }: { car: GarageCar }) {
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
      onPress={() => {
        pressFeedback();
        router.push(`/car/${car.id}`);
      }}
    >
      {car.photoUrl ? (
        <Image
          source={{ uri: car.photoUrl, cacheKey: `car-${car.id}` }}
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
      <LinearGradient colors={scrim} style={styles.scrim} />
      <View style={styles.badges}>
        {attention ? <StatusPill status={attention.status} count={attention.count} /> : <View />}
        {car.favorite && <Feather name="star" size={20} color={colors.amber} />}
      </View>
      <View style={styles.plateText}>
        <Text style={styles.name} numberOfLines={1}>
          {car.nickname ?? car.name}
        </Text>
        {car.nickname && (
          <Text style={styles.fullName} numberOfLines={1}>
            {car.name}
          </Text>
        )}
        <Odometer miles={car.currentMileage} />
      </View>
    </Pressable>
  );
}

function MoveButton({
  direction,
  name,
  enabled,
  onPress,
}: {
  direction: "up" | "down";
  name: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${name} ${direction}`}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={4}
      style={({ pressed }) => [styles.move, pressed && styles.movePressed]}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Feather
        name={`chevron-${direction}`}
        size={24}
        color={enabled ? colors.amber : colors.edge}
      />
    </Pressable>
  );
}

function ReorderRow({
  car,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  car: GarageCar;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  const name = car.nickname ?? car.name;
  return (
    <View style={styles.reorderRow}>
      {car.photoUrl ? (
        <Image source={{ uri: car.photoUrl, cacheKey: `car-${car.id}` }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.noThumb]}>
          <Feather name="camera" size={18} color={colors.edge} />
        </View>
      )}
      <Text style={styles.reorderName} numberOfLines={2}>
        {name}
      </Text>
      {car.favorite && <Feather name="star" size={18} color={colors.amber} />}
      <MoveButton direction="up" name={name} enabled={canMoveUp} onPress={() => onMove("up")} />
      <MoveButton
        direction="down"
        name={name}
        enabled={canMoveDown}
        onPress={() => onMove("down")}
      />
    </View>
  );
}

export default function Garage() {
  const { data, error, reload } = useApi<GarageCar[]>("/vehicles");
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [moving, setMoving] = useState(false);

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const move = async (car: GarageCar, direction: "up" | "down") => {
    setMoving(true);
    try {
      await api(`/vehicles/${car.id}/move`, { method: "POST", body: { direction } });
      await reload();
    } catch (err) {
      Alert.alert("Car not moved", errorMessage(err));
    } finally {
      setMoving(false);
    }
  };

  // Favorites and the rest are ordered separately, so a car can't cross that line.
  const canSwap = (index: number, neighbor: number) =>
    !moving && !!data[neighbor] && data[neighbor].favorite === data[index].favorite;

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
        ) : reordering ? (
          <>
            <Body style={styles.hint}>
              Favorites stay at the top, so a car moves within its own group.
            </Body>
            <View style={styles.reorderList}>
              {data.map((car, i) => (
                <ReorderRow
                  key={car.id}
                  car={car}
                  canMoveUp={canSwap(i, i - 1)}
                  canMoveDown={canSwap(i, i + 1)}
                  onMove={(direction) => move(car, direction)}
                />
              ))}
            </View>
            <Button label="Done" onPress={() => setReordering(false)} />
          </>
        ) : (
          <>
            {data.map((car) => (
              <CarPlate key={car.id} car={car} />
            ))}
            {data.length > 1 && (
              <ListGroup>
                <ListRow icon="list" label="Reorder cars" onPress={() => setReordering(true)} />
              </ListGroup>
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
  plate: {
    aspectRatio: 4 / 3,
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
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  reorderList: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  thumb: { width: 56, height: 42, borderRadius: radius.sm, backgroundColor: colors.graphite },
  noThumb: { alignItems: "center", justifyContent: "center" },
  reorderName: {
    flex: 1,
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  move: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  movePressed: { backgroundColor: colors.graphite },
});
