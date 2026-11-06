import { Feather } from "@expo/vector-icons";
import type { CarDetail, CarRecord, CarReminder, ReminderStatus } from "@revlog/api";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { PhotoStrip } from "@/components/photo-strip";
import {
  Body,
  Button,
  EmptyState,
  Heading,
  LoadFailed,
  Loading,
  Odometer,
  Screen,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatMiles, formatMoney } from "@/lib/format";
import { choosePhotoForm } from "@/lib/photos";
import { colors, fonts, space, statusStyles } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

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

const edge = (status: ReminderStatus) =>
  status === "ok" ? colors.edge : statusStyles[status].text;

function ReminderRow({ carId, reminder }: { carId: string; reminder: CarReminder }) {
  return (
    <View style={[styles.reminder, { borderLeftColor: edge(reminder.status) }]}>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log ${reminder.task}`}
        hitSlop={8}
        style={styles.logButton}
        onPress={() =>
          router.push({
            pathname: "/car/[id]/service/new",
            params: {
              id: carId,
              reminderId: reminder.id,
              category: reminder.serviceCategory ?? "other",
              title: reminder.serviceCategory ? "" : reminder.task,
            },
          })
        }
      >
        <Text style={styles.logLabel}>Log it</Text>
      </Pressable>
    </View>
  );
}

function RecordRow({ carId, record }: { carId: string; record: CarRecord }) {
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
      <View style={styles.recordHead}>
        <Text style={styles.rowTitle}>{record.title}</Text>
        <Text style={styles.rowDetail}>{formatDate(record.servicedOn)}</Text>
      </View>
      {facts.length > 0 && <Text style={styles.rowDetail}>{facts.join(", ")}</Text>}
    </Pressable>
  );
}

export default function Car() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);
  const [refreshing, setRefreshing] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);

  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

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

  const buildPhotos = car.photos.filter((p) => !p.recordId && !p.modId);

  return (
    <>
      <Stack.Screen options={{ title: car.nickname ?? car.name }} />
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
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={car.photoUrl ? "Change car photo" : "Add car photo"}
          onPress={changingPhoto ? undefined : changePhoto}
        >
          {car.photoUrl ? (
            <Image
              source={{ uri: car.photoUrl, cacheKey: `car-${car.id}-${car.photoUrl.split("?")[0]}` }}
              style={styles.hero}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.hero, styles.noHero]}>
              <Feather name="camera" size={24} color={colors.amber} />
              <Text style={styles.noHeroLabel}>Add car photo</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.head}>
          {car.nickname && <Body style={styles.fullName}>{car.name}</Body>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Update mileage, now ${formatMiles(car.currentMileage)}`}
            style={styles.odometerRow}
            onPress={() =>
              router.push({
                pathname: "/car/[id]/mileage",
                params: { id, current: String(car.currentMileage) },
              })
            }
          >
            <Odometer miles={car.currentMileage} large />
            <Feather name="edit-2" size={18} color={colors.steel} />
          </Pressable>
        </View>

        <Section
          title="Reminders"
          action={{ label: "Add", onPress: () => router.push(`/car/${id}/reminders/new`) }}
        >
          {car.reminders.length === 0 ? (
            <EmptyState
              title="No reminders yet"
              body="Add one to know when the next service is due."
              action={
                <Button
                  label="Add a reminder"
                  kind="secondary"
                  onPress={() => router.push(`/car/${id}/reminders/new`)}
                />
              }
            />
          ) : (
            car.reminders.map((r) => <ReminderRow key={r.id} carId={id} reminder={r} />)
          )}
        </Section>

        <Section
          title="Service log"
          action={{ label: "Log", onPress: () => router.push(`/car/${id}/service/new`) }}
        >
          {car.records.length === 0 ? (
            <EmptyState
              title="No services logged"
              body="Log one and its reminder counts from that date and mileage."
              action={
                <Button
                  label="Log a service"
                  kind="secondary"
                  onPress={() => router.push(`/car/${id}/service/new`)}
                />
              }
            />
          ) : (
            <View>
              {car.records.map((r) => (
                <RecordRow key={r.id} carId={id} record={r} />
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
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.panel },
  noHero: { alignItems: "center", justifyContent: "center", gap: space.xs },
  noHeroLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 14 },
  head: { gap: space.xs },
  fullName: { color: colors.steel },
  odometerRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52 },
  section: { gap: space.md, marginTop: space.md },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 },
  sectionActionLabel: { color: colors.amber, fontFamily: fonts.medium, fontSize: 15 },
  reminder: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: space.md,
  },
  reminderMain: { flex: 1, paddingVertical: space.xs },
  logButton: { minHeight: 44, minWidth: 60, alignItems: "flex-end", justifyContent: "center" },
  logLabel: { color: colors.amber, fontFamily: fonts.medium, fontSize: 15 },
  record: {
    gap: 2,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  recordHead: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
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
