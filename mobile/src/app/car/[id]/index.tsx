import { Feather } from "@expo/vector-icons";
import type { CarDetail, CarRecord, CarReminder } from "@revlog/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { PhotoStrip } from "@/components/photo-strip";
import {
  Button,
  EmptyState,
  Heading,
  LoadFailed,
  Loading,
  Odometer,
  StatusPill,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatMiles, formatMoney } from "@/lib/format";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import { choosePhotoForm } from "@/lib/photos";
import { colors, fonts, MAX_WIDTH, radius, scrim, space, statusStyles } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const MAX_HERO = 460;
const headerScrim = ["rgba(28, 28, 30, 0.7)", "rgba(28, 28, 30, 0)"] as const;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Heading>{title}</Heading>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={8}
            style={styles.sectionAction}
            onPress={action.onPress}
          >
            <Feather name="plus" size={18} color={colors.amber} />
            <Text style={styles.sectionActionLabel}>{action.label}</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
      onPress={() => {
        pressFeedback();
        onPress();
      }}
    >
      <Feather name={icon} size={22} color={colors.amber} />
      <Text style={styles.quickLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ReminderRow({ carId, reminder }: { carId: string; reminder: CarReminder }) {
  const log = () =>
    router.push({
      pathname: "/car/[id]/service/new",
      params: {
        id: carId,
        reminderId: reminder.id,
        category: reminder.serviceCategory ?? "other",
        title: reminder.serviceCategory ? "" : reminder.task,
      },
    });
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={48}
      overshootRight={false}
      onSwipeableWillOpen={tapFeedback}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Log ${reminder.task}`}
          style={styles.swipeAction}
          onPress={log}
        >
          <Feather name="check" size={22} color={colors.onAmber} />
          <Text style={styles.swipeLabel}>Log it</Text>
        </Pressable>
      )}
    >
      <View style={styles.reminder}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${reminder.task}`}
          style={styles.reminderMain}
          onPress={() => router.push(`/car/${carId}/reminders/${reminder.id}`)}
        >
          <Text style={styles.rowTitle}>{reminder.task}</Text>
          <Text style={[styles.rowDetail, { color: statusStyles[reminder.status].text }]}>
            {reminder.due}
          </Text>
        </Pressable>
        <StatusPill status={reminder.status} />
      </View>
    </ReanimatedSwipeable>
  );
}

function RecordRow({
  carId,
  record,
  newest,
  last,
}: {
  carId: string;
  record: CarRecord;
  newest: boolean;
  last: boolean;
}) {
  const facts = [
    record.mileage != null ? formatMiles(record.mileage) : null,
    record.cost ? formatMoney(record.cost) : null,
    record.shop,
  ].filter(Boolean);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${record.title}`}
      style={({ pressed }) => [styles.record, pressed && styles.pressed]}
      onPress={() => router.push(`/car/${carId}/service/${record.id}`)}
    >
      <View style={styles.rail}>
        <View style={[styles.dot, newest && styles.dotNewest]} />
        {!last && <View style={styles.railLine} />}
      </View>
      <View style={styles.recordBody}>
        <Text style={styles.recordDate}>{formatDate(record.servicedOn)}</Text>
        <Text style={styles.rowTitle}>{record.title}</Text>
        {facts.length > 0 && <Text style={styles.rowDetail}>{facts.join(", ")}</Text>}
      </View>
    </Pressable>
  );
}

export default function Car() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [favorite, setFavorite] = useState<boolean | null>(null);
  const scrollY = useSharedValue(0);
  const heroHeight = Math.min(width * 0.95, MAX_HERO);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // The photo stretches on pull and drifts slower than the page on scroll.
  const heroMotion = useAnimatedStyle(() => {
    const y = scrollY.get();
    return {
      transform: [
        { translateY: y < 0 ? y / 2 : y * 0.4 },
        { scale: interpolate(y, [-heroHeight, 0], [2, 1], "clamp") },
      ],
    };
  });

  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const starred = favorite ?? car.favorite;

  const toggleFavorite = async () => {
    const next = !starred;
    tapFeedback();
    setFavorite(next);
    try {
      await api(`/vehicles/${id}/favorite`, { method: "POST", body: { favorite: next } });
    } catch (err) {
      setFavorite(!next);
      Alert.alert("Favorite not saved", errorMessage(err));
    }
  };

  const changePhoto = async () => {
    if (!car.canUpload) {
      Alert.alert("Confirm your email", "Confirm your email to add photos. Resend the link from Account.");
      return;
    }
    try {
      const form = await choosePhotoForm();
      if (!form) return;
      setChangingPhoto(true);
      await api(`/vehicles/${id}/photo`, { method: "POST", form });
      await reload();
    } catch (err) {
      Alert.alert("Photo not changed", err instanceof Error ? errorMessage(err) : undefined);
    } finally {
      setChangingPhoto(false);
    }
  };

  const logService = () => router.push(`/car/${id}/service/new`);
  const addReminder = () => router.push(`/car/${id}/reminders/new`);
  const updateMileage = () =>
    router.push({
      pathname: "/car/[id]/mileage",
      params: { id, current: String(car.currentMileage) },
    });

  const buildPhotos = car.photos.filter((p) => !p.recordId && !p.modId);

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: starred }}
              accessibilityLabel={starred ? "Remove from favorites" : "Add to favorites"}
              hitSlop={8}
              style={styles.headerButton}
              onPress={toggleFavorite}
            >
              <Feather name="star" size={22} color={starred ? colors.amber : colors.chalk} />
            </Pressable>
          ),
        }}
      />
      <Animated.ScrollView
        style={styles.page}
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
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
        <View style={[styles.heroFrame, { height: heroHeight }]}>
          <Animated.View style={[StyleSheet.absoluteFill, heroMotion]}>
            {car.photoUrl ? (
              <Image
                source={{ uri: car.photoUrl, cacheKey: `car-${car.id}-${car.photoUrl.split("?")[0]}` }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.noHero}>
                <Feather name="camera" size={32} color={colors.edge} />
              </View>
            )}
          </Animated.View>
          <LinearGradient colors={headerScrim} style={styles.topScrim} />
          <LinearGradient colors={scrim} style={styles.bottomScrim} />
          <View style={styles.heroText}>
            <View style={styles.heroName}>
              <Text style={styles.name} accessibilityRole="header" numberOfLines={2}>
                {car.nickname ?? car.name}
              </Text>
              {car.nickname && <Text style={styles.fullName}>{car.name}</Text>}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={car.photoUrl ? "Change car photo" : "Add car photo"}
              hitSlop={4}
              style={styles.cameraButton}
              onPress={changingPhoto ? undefined : changePhoto}
            >
              {changingPhoto ? (
                <ActivityIndicator color={colors.chalk} />
              ) : (
                <Feather name="camera" size={20} color={colors.chalk} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.column}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Update mileage, now ${formatMiles(car.currentMileage)}`}
            onPress={updateMileage}
          >
            <Odometer miles={car.currentMileage} large />
          </Pressable>

          <View style={styles.quickActions}>
            <QuickAction icon="tool" label="Log service" onPress={logService} />
            <QuickAction icon="bell" label="Add reminder" onPress={addReminder} />
            <QuickAction icon="edit-2" label="Mileage" onPress={updateMileage} />
          </View>

          <Section title="Reminders">
            {car.reminders.length === 0 ? (
              <EmptyState
                title="No reminders yet"
                body="Add one to know when the next service is due."
                action={<Button label="Add a reminder" kind="secondary" onPress={addReminder} />}
              />
            ) : (
              <View style={styles.panel}>
                {car.reminders.map((r) => (
                  <ReminderRow key={r.id} carId={id} reminder={r} />
                ))}
              </View>
            )}
          </Section>

          <Section title="Service log">
            {car.records.length === 0 ? (
              <EmptyState
                title="No services logged"
                body="Log one and its reminder counts from that date and mileage."
                action={<Button label="Log a service" kind="secondary" onPress={logService} />}
              />
            ) : (
              <View>
                {car.records.map((r, i) => (
                  <RecordRow
                    key={r.id}
                    carId={id}
                    record={r}
                    newest={i === 0}
                    last={i === car.records.length - 1}
                  />
                ))}
              </View>
            )}
          </Section>

          <Section title="Photos">
            <PhotoStrip
              carId={id}
              photos={buildPhotos}
              limit={car.photoLimit}
              canUpload={car.canUpload}
              onChange={reload}
            />
          </Section>
        </View>
      </Animated.ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.asphalt },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  heroFrame: { overflow: "hidden", backgroundColor: colors.panel, justifyContent: "flex-end" },
  noHero: { flex: 1, alignItems: "center", justifyContent: "center" },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  bottomScrim: { position: "absolute", bottom: 0, left: 0, right: 0, height: "60%" },
  heroText: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.md,
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  heroName: { flex: 1, gap: 2 },
  name: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36 },
  fullName: { color: colors.label, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(54, 54, 58, 0.8)",
  },
  column: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl * 2,
    gap: space.lg,
    backgroundColor: colors.asphalt,
  },
  quickActions: { flexDirection: "row", gap: space.sm },
  quickAction: {
    flex: 1,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  quickActionPressed: { backgroundColor: colors.graphite, transform: [{ scale: 0.97 }] },
  quickLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 13 },
  section: { gap: space.md, marginTop: space.md },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 },
  sectionActionLabel: { color: colors.amber, fontFamily: fonts.medium, fontSize: 15 },
  panel: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 60,
    backgroundColor: colors.panel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  reminderMain: { flex: 1, justifyContent: "center", minHeight: 44 },
  swipeAction: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.amber,
  },
  swipeLabel: { color: colors.onAmber, fontFamily: fonts.bold, fontSize: 14 },
  record: { flexDirection: "row", gap: space.md },
  rail: { width: 12, alignItems: "center", paddingTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.edge },
  dotNewest: { backgroundColor: colors.amber },
  railLine: { flex: 1, width: 2, marginTop: space.xs, backgroundColor: colors.rule },
  recordBody: { flex: 1, gap: 2, paddingBottom: space.xl },
  recordDate: { color: colors.steel, fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.7 },
  rowTitle: {
    flexShrink: 1,
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  rowDetail: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
