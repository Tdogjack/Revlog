import { Feather } from "@expo/vector-icons";
import type { GarageCar } from "@revlog/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  Button,
  EmptyState,
  LoadFailed,
  Loading,
  Odometer,
  Screen,
  StatusPill,
} from "@/components/ui";
import { pressFeedback } from "@/lib/haptics";
import { colors, fonts, radius, scrim, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function CarPlate({ car }: { car: GarageCar }) {
  const attention = car.urgency && car.urgency.status !== "ok" ? car.urgency : null;
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

export default function Garage() {
  const { data, error, reload } = useApi<GarageCar[]>("/vehicles");
  const [refreshing, setRefreshing] = useState(false);

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

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
          data.map((car) => <CarPlate key={car.id} car={car} />)
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
});
