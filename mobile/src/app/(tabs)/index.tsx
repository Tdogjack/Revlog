import { Feather } from "@expo/vector-icons";
import type { GarageCar } from "@revlog/api";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Button,
  EmptyState,
  LoadFailed,
  Loading,
  Odometer,
  Screen,
  StatusLabel,
} from "@/components/ui";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function CarRow({ car }: { car: GarageCar }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={car.nickname ?? car.name}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/car/${car.id}`)}
    >
      {car.photoUrl ? (
        <Image source={{ uri: car.photoUrl, cacheKey: `car-${car.id}` }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.noPhoto]}>
          <Feather name="truck" size={24} color={colors.steel} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={2}>
          {car.nickname ?? car.name}
        </Text>
        <Odometer miles={car.currentMileage} />
        {car.urgency && car.urgency.status !== "ok" && <StatusLabel status={car.urgency.status} />}
      </View>
      {car.favorite && <Feather name="star" size={18} color={colors.amber} />}
    </Pressable>
  );
}

export default function Garage() {
  const { data, error, reload } = useApi<GarageCar[]>("/vehicles");
  const [refreshing, setRefreshing] = useState(false);

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  return (
    <>
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
            <View>
              {data.map((car) => (
                <CarRow key={car.id} car={car} />
              ))}
            </View>
            <Button label="Add a car" kind="secondary" onPress={() => router.push("/add-car")} />
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  rowPressed: { opacity: 0.7 },
  photo: { width: 96, height: 72, borderRadius: 6, backgroundColor: colors.panel },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 2 },
  name: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
});
