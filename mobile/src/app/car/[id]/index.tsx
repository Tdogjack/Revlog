import { Feather } from "@expo/vector-icons";
import type {
  CarDetail,
  CarMod,
  CarPart,
  CarPhoto,
  CarRecord,
  CarReminder,
  ModStatus,
} from "@revlog/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeIn,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { MileageGraph } from "@/components/mileage-graph";
import { PhotoStrip } from "@/components/photo-strip";
import { PhotoViewer } from "@/components/photo-viewer";
import {
  Button,
  EmptyState,
  Heading,
  ListGroup,
  ListRow,
  LoadFailed,
  Loading,
  Odometer,
  StatusPill,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDollars, formatMiles, formatMoney } from "@/lib/format";
import { shareServiceHistory } from "@/lib/pdf";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import { choosePhotoForm, editPhoto } from "@/lib/photos";
import {
  alpha,
  colors,
  fonts,
  headerScrim,
  MAX_WIDTH,
  photoInk,
  photoInkMuted,
  radius,
  scrim,
  space,
  statusStyles,
  tracking,
} from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const MAX_HERO = 460;

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: {
    label: string;
    icon?: React.ComponentProps<typeof Feather>["name"];
    hint?: string;
    onPress: () => void;
  };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Heading>{title}</Heading>
        {action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.hint ?? action.label}
            hitSlop={8}
            style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
            onPress={() => {
              tapFeedback();
              action.onPress();
            }}
          >
            <Feather name={action.icon ?? "plus"} size={18} color={colors.amber} />
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

const every = (reminder: CarReminder) =>
  [
    reminder.intervalMiles != null && formatMiles(reminder.intervalMiles),
    reminder.intervalMonths != null &&
      `${reminder.intervalMonths} ${reminder.intervalMonths === 1 ? "month" : "months"}`,
  ]
    .filter(Boolean)
    .join(" or ");

function ReminderRow({
  carId,
  reminder,
  onChange,
}: {
  carId: string;
  reminder: CarReminder;
  onChange: () => void;
}) {
  const unknown = reminder.status === "unknown";
  const interval = every(reminder);
  const neverDone = async () => {
    try {
      await api(`/vehicles/${carId}/reminders/${reminder.id}/never-done`, {
        method: "POST",
        body: {},
      });
      onChange();
    } catch (err) {
      Alert.alert("Reminder not changed", errorMessage(err));
    }
  };
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
          {interval !== "" && (
            <Text style={styles.rowDetail}>
              Every {interval}
              {reminder.lastDoneOn ? `, last done ${formatDate(reminder.lastDoneOn)}` : ""}
            </Text>
          )}
        </Pressable>
        {/* "No service logged" already says it; a pill would repeat it. */}
        {!unknown && (
          <View style={styles.reminderSide}>
            <StatusPill status={reminder.status} />
            <RowButton
              icon="check"
              label="Done"
              hint={`Log ${reminder.task} as done`}
              onPress={log}
            />
          </View>
        )}
        {unknown && (
          <View style={styles.reminderChoices}>
            <RowButton label="Log service" hint={`Log ${reminder.task}`} onPress={log} />
            <RowButton
              label="Never done"
              hint={`Mark ${reminder.task} as never done`}
              onPress={neverDone}
            />
          </View>
        )}
      </View>
    </ReanimatedSwipeable>
  );
}

// A small outlined button inside a row, big enough to tap.
function RowButton({
  icon,
  label,
  hint,
  onPress,
}: {
  icon?: React.ComponentProps<typeof Feather>["name"];
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={6}
      style={({ pressed }) => [styles.rowButton, pressed && styles.rowButtonPressed]}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      {icon && <Feather name={icon} size={16} color={colors.chalk} />}
      <Text style={styles.rowButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const modStatus: Record<ModStatus, { label: string; color: string }> = {
  installed: { label: "Installed", color: colors.done },
  planned: { label: "Planned", color: colors.chalk },
  removed: { label: "Removed", color: colors.steel },
};

// What an opened row holds, so the closed row can say it before you tap.
function detailsHint(notes: string | null, parts: number, photos: number) {
  const bits = [
    notes && "notes",
    parts > 0 && `${parts} ${parts === 1 ? "part" : "parts"}`,
    photos > 0 && `${photos} ${photos === 1 ? "photo" : "photos"}`,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(", ") : "Options";
}

function DetailsHint({ open, label }: { open: boolean; label: string }) {
  return (
    <View style={styles.hint}>
      <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.steel} />
      <Text style={styles.hintLabel}>{label}</Text>
    </View>
  );
}

function PartLine({ part }: { part: CarPart }) {
  const facts = [
    part.quantity > 1 ? `x${part.quantity}` : null,
    part.price ? formatMoney(part.price) : null,
    part.trackPrice && part.lowestPrice != null
      ? `lowest ${formatMoney(String(part.lowestPrice))}`
      : null,
  ].filter(Boolean);
  const body = (
    <>
      <View style={styles.partText}>
        <Text style={styles.partName}>{part.name}</Text>
        {facts.length > 0 && <Text style={styles.rowDetail}>{facts.join(", ")}</Text>}
      </View>
      {part.url && <Feather name="external-link" size={16} color={colors.steel} />}
    </>
  );
  if (!part.url) return <View style={styles.part}>{body}</View>;
  const url = part.url;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open the link for ${part.name}`}
      style={({ pressed }) => [styles.part, pressed && styles.pressed]}
      onPress={() => Linking.openURL(url).catch(() => Alert.alert("Link not opened", url))}
    >
      {body}
    </Pressable>
  );
}

// Notes, parts, and photos for an opened row, with its buttons underneath.
function Details({
  carId,
  notes,
  parts,
  partsLabel,
  photos,
  photoLimit,
  kind,
  targetId,
  onChange,
  children,
}: {
  carId: string;
  notes: string | null;
  parts: CarPart[];
  partsLabel: string;
  photos: CarPhoto[];
  photoLimit: number;
  kind: "record" | "mod";
  targetId: string;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.details}>
      {notes && (
        <Text style={styles.notes} selectable>
          {notes}
        </Text>
      )}
      {parts.length > 0 && (
        <View style={styles.parts}>
          <Text style={styles.partsLabel}>{partsLabel}</Text>
          {parts.map((p) => (
            <PartLine key={p.id} part={p} />
          ))}
        </View>
      )}
      {photos.length > 0 && (
        <PhotoStrip
          carId={carId}
          photos={photos}
          limit={photoLimit}
          canUpload={false}
          canAdd={false}
          kind={kind}
          targetId={targetId}
          onChange={onChange}
        />
      )}
      <View style={styles.detailActions}>{children}</View>
    </Animated.View>
  );
}

function ModRow({
  carId,
  mod,
  photos,
  photoLimit,
  onChange,
}: {
  carId: string;
  mod: CarMod;
  photos: CarPhoto[];
  photoLimit: number;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const name = mod.brand ? `${mod.brand} ${mod.part}` : mod.part;
  const facts = [
    mod.categoryLabel,
    mod.cost ? formatMoney(mod.cost) : null,
    mod.installedOn ? formatDate(mod.installedOn) : null,
  ].filter(Boolean);
  return (
    <View style={styles.mod}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint={open ? "Hides details" : "Shows details"}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.modMain, pressed && styles.pressed]}
        onPress={() => {
          tapFeedback();
          setOpen(!open);
        }}
      >
        <View style={styles.modHead}>
          <Text style={[styles.rowTitle, mod.status === "removed" && styles.removed]}>{name}</Text>
          <Text style={[styles.modStatus, { color: modStatus[mod.status].color }]}>
            {modStatus[mod.status].label}
          </Text>
        </View>
        {facts.length > 0 && <Text style={styles.rowDetail}>{facts.join(", ")}</Text>}
        <DetailsHint open={open} label={detailsHint(mod.notes, mod.parts.length, photos.length)} />
      </Pressable>
      {open && (
        <Details
          carId={carId}
          notes={mod.notes}
          parts={mod.parts}
          partsLabel={mod.status === "planned" ? "Parts wanted" : "Parts used"}
          photos={photos}
          photoLimit={photoLimit}
          kind="mod"
          targetId={mod.id}
          onChange={onChange}
        >
          <RowButton
            icon="edit-2"
            label="Edit"
            hint={`Edit ${name}`}
            onPress={() => router.push(`/car/${carId}/mods/${mod.id}`)}
          />
        </Details>
      )}
    </View>
  );
}

function BuildStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RecordRow({
  carId,
  record,
  photos,
  photoLimit,
  newest,
  last,
  onChange,
}: {
  carId: string;
  record: CarRecord;
  photos: CarPhoto[];
  photoLimit: number;
  newest: boolean;
  last: boolean;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const facts = [
    record.mileage != null ? formatMiles(record.mileage) : null,
    record.cost ? formatMoney(record.cost) : null,
    record.shop,
  ].filter(Boolean);
  return (
    <View style={styles.record}>
      <View style={styles.rail}>
        <View style={[styles.dot, newest && styles.dotNewest]} />
        {!last && <View style={styles.railLine} />}
      </View>
      <View style={styles.recordBody}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${record.title}, ${formatDate(record.servicedOn)}`}
          accessibilityHint={open ? "Hides details" : "Shows details"}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.recordMain, pressed && styles.pressed]}
          onPress={() => {
            tapFeedback();
            setOpen(!open);
          }}
        >
          <Text style={styles.recordDate}>{formatDate(record.servicedOn)}</Text>
          <Text style={styles.rowTitle}>{record.title}</Text>
          {facts.length > 0 && <Text style={styles.rowDetail}>{facts.join(", ")}</Text>}
          <DetailsHint
            open={open}
            label={detailsHint(record.notes, record.parts.length, photos.length)}
          />
        </Pressable>
        {open && (
          <Details
            carId={carId}
            notes={record.notes}
            parts={record.parts}
            partsLabel="Parts used"
            photos={photos}
            photoLimit={photoLimit}
            kind="record"
            targetId={record.id}
            onChange={onChange}
          >
            <RowButton
              icon="edit-2"
              label="Edit"
              hint={`Edit ${record.title}`}
              onPress={() => router.push(`/car/${carId}/service/${record.id}`)}
            />
            <RowButton
              icon="copy"
              label="Log again"
              hint={`Log ${record.title} again, with its parts`}
              onPress={() =>
                router.push({
                  pathname: "/car/[id]/service/new",
                  params: { id: carId, copyId: record.id },
                })
              }
            />
          </Details>
        )}
      </View>
    </View>
  );
}

export default function Car() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [favorite, setFavorite] = useState<boolean | null>(null);
  const [solidHeader, setSolidHeader] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const scrollY = useSharedValue(0);
  const heroHeight = Math.min(width * 0.95, MAX_HERO);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // Once the photo has scrolled away, the header gets a solid bar and the
  // car's name, so its buttons never sit on top of the page.
  useAnimatedReaction(
    () => scrollY.get() > heroHeight - 120,
    (past, before) => {
      if (past !== before) scheduleOnRN(setSolidHeader, past);
    },
    [heroHeight],
  );

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
  // Over the photo the header and name use the photo's own ink.
  const onPhoto = !!car.photoUrl;
  const headerInk = onPhoto && !solidHeader ? photoInk : colors.chalk;

  const toggleFavorite = async () => {
    const next = !starred;
    tapFeedback();
    setFavorite(next);
    try {
      await api(`/vehicles/${id}/favorite`, {
        method: "POST",
        body: { favorite: next },
      });
    } catch (err) {
      setFavorite(!next);
      Alert.alert("Favorite not saved", errorMessage(err));
    }
  };

  const removePhoto = async () => {
    setChangingPhoto(true);
    try {
      await api(`/vehicles/${id}/photo`, { method: "DELETE" });
      await reload();
    } catch (err) {
      Alert.alert("Photo not removed", errorMessage(err));
    } finally {
      setChangingPhoto(false);
    }
  };

  // With a photo there are two things to do with it, so ask which.
  const photoOptions = () => {
    if (!car.photoUrl) {
      changePhoto();
      return;
    }
    Alert.alert("Car photo", undefined, [
      { text: "Choose a new photo", onPress: changePhoto },
      { text: "Remove photo", style: "destructive", onPress: removePhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      await shareServiceHistory(id, car.nickname ?? car.name);
    } catch (err) {
      Alert.alert("PDF not ready", errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const takeDownBuild = () => {
    Alert.alert(
      "Take down your public build?",
      "The post and its shared photos are removed. You can post it again any time.",
      [
        { text: "Keep build", style: "cancel" },
        {
          text: "Take down",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/community/posts/${car.buildPostId}`, {
                method: "DELETE",
              });
              await reload();
            } catch (err) {
              Alert.alert("Build not taken down", errorMessage(err));
            }
          },
        },
      ],
    );
  };

  // Crops or rotates the car's photo, or a build photo, and saves it in place.
  const recropPhoto = async (photo: { id: string; url: string }) => {
    setViewing(null);
    try {
      const edited = await editPhoto({ url: photo.url });
      if (!edited) return;
      setChangingPhoto(true);
      if (photo.id === `car-${car.id}`) {
        await api(`/vehicles/${id}/photo`, {
          method: "POST",
          form: edited.form,
        });
      } else {
        await api(`/vehicles/${id}/photos/${photo.id}`, {
          method: "PUT",
          form: edited.form,
        });
      }
      await reload();
    } catch (err) {
      Alert.alert("Photo not saved", errorMessage(err));
    } finally {
      setChangingPhoto(false);
    }
  };

  const changePhoto = async () => {
    if (!car.canUpload) {
      Alert.alert(
        "Confirm your email",
        "Confirm your email to add photos. Resend the link from Account.",
      );
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
  const addMod = () =>
    router.push({
      pathname: "/car/[id]/mods/new",
      params: { id, mileage: String(car.currentMileage) },
    });
  const updateMileage = () =>
    router.push({
      pathname: "/car/[id]/mileage",
      params: { id, current: String(car.currentMileage) },
    });

  const buildPhotos = car.photos.filter((p) => !p.recordId && !p.modId);
  // The car's own photo first, then the build photos, to swipe through.
  const heroPhotos = [
    ...(car.photoUrl ? [{ id: `car-${car.id}`, url: car.photoUrl }] : []),
    ...buildPhotos,
  ];
  const sumCost = (mods: CarMod[]) => mods.reduce((sum, m) => sum + Number(m.cost ?? 0), 0);
  const installed = car.mods.filter((m) => m.status === "installed");
  const planned = car.mods.filter((m) => m.status === "planned");
  const spent = car.records.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);
  const [builtYear, builtMonth] = car.builtOn?.split("-") ?? [];
  const facts = [
    car.vin && `VIN ${car.vin}`,
    builtYear && `Built ${builtMonth}/${builtYear}`,
  ].filter(Boolean);

  return (
    <>
      <Stack.Screen
        options={{
          title: solidHeader ? (car.nickname ?? car.name) : "",
          headerStyle: {
            backgroundColor: solidHeader ? colors.asphalt : "transparent",
          },
          headerTintColor: headerInk,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: starred }}
                accessibilityLabel={starred ? "Remove from favorites" : "Add to favorites"}
                hitSlop={8}
                style={styles.headerButton}
                onPress={toggleFavorite}
              >
                <Feather name="star" size={22} color={starred ? colors.amber : headerInk} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit car"
                hitSlop={8}
                style={styles.headerButton}
                onPress={() => router.push(`/car/${id}/edit`)}
              >
                <Feather name="settings" size={22} color={headerInk} />
              </Pressable>
            </View>
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
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={!car.photoUrl}
            accessibilityRole="imagebutton"
            accessibilityLabel="Open car photos"
            onPress={() => setViewing(0)}
          >
            <Animated.View style={[StyleSheet.absoluteFill, heroMotion]}>
              {car.photoUrl ? (
                <Image
                  source={{
                    uri: car.photoUrl,
                    cacheKey: `car-${car.id}-${car.photoUrl.split("?")[0]}`,
                  }}
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
          </Pressable>
          {onPhoto && (
            <LinearGradient colors={headerScrim} style={styles.topScrim} pointerEvents="none" />
          )}
          {onPhoto && (
            <LinearGradient colors={scrim} style={styles.bottomScrim} pointerEvents="none" />
          )}
          <View style={styles.heroText} pointerEvents="box-none">
            <View style={styles.heroName}>
              <Text
                style={[styles.name, onPhoto && styles.onPhoto]}
                accessibilityRole="header"
                numberOfLines={2}
              >
                {car.nickname ?? car.name}
              </Text>
              {car.nickname && (
                <Text style={[styles.fullName, onPhoto && styles.onPhotoMuted]}>{car.name}</Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={car.photoUrl ? "Change or remove car photo" : "Add car photo"}
              hitSlop={4}
              style={styles.cameraButton}
              onPress={changingPhoto ? undefined : photoOptions}
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
            <View style={styles.odometerRow}>
              <Odometer miles={car.currentMileage} large />
              <Feather name="edit-2" size={18} color={colors.steel} />
            </View>
          </Pressable>
          {facts.length > 0 && (
            <Text style={styles.facts} selectable>
              {facts.join("   ")}
            </Text>
          )}

          <View style={styles.quickActions}>
            <QuickAction icon="tool" label="Log service" onPress={logService} />
            <QuickAction icon="zap" label="Add mod" onPress={addMod} />
            <QuickAction icon="bell" label="Add reminder" onPress={addReminder} />
          </View>

          {car.timeline && (
            <Section title="Mileage">
              <MileageGraph timeline={car.timeline} />
            </Section>
          )}

          <Section
            title="Reminders"
            action={
              car.reminders.length > 0
                ? { label: "Add", hint: "Add a reminder", onPress: addReminder }
                : undefined
            }
          >
            {car.reminders.length === 0 ? (
              <EmptyState
                title="No reminders yet"
                body="Add one to know when the next service is due."
                action={<Button label="Add a reminder" kind="secondary" onPress={addReminder} />}
              />
            ) : (
              <View style={styles.panel}>
                {car.reminders.map((r) => (
                  <ReminderRow key={r.id} carId={id} reminder={r} onChange={reload} />
                ))}
              </View>
            )}
          </Section>

          <Section
            title="Build"
            action={
              car.mods.length > 0 ? { label: "Add", hint: "Add a mod", onPress: addMod } : undefined
            }
          >
            {car.mods.length === 0 ? (
              <EmptyState
                title="No mods yet"
                body="Add parts you've installed, or plan your next build."
                action={<Button label="Add a mod" kind="secondary" onPress={addMod} />}
              />
            ) : (
              <>
                <View style={styles.stats}>
                  <BuildStat value={String(installed.length)} label="Installed" />
                  <BuildStat value={formatDollars(sumCost(installed))} label="Spent" />
                  <BuildStat value={formatDollars(sumCost(planned))} label="Planned" />
                </View>
                <View style={styles.panel}>
                  {car.mods.map((m) => (
                    <ModRow
                      key={m.id}
                      carId={id}
                      mod={m}
                      photos={car.photos.filter((p) => p.modId === m.id)}
                      photoLimit={car.photoLimit}
                      onChange={reload}
                    />
                  ))}
                </View>
              </>
            )}
            <ListGroup>
              {car.buildPostId && (
                <ListRow
                  icon="eye"
                  label="View public build"
                  onPress={() => router.push(`/post/${car.buildPostId}`)}
                />
              )}
              <ListRow
                icon="share"
                label={car.buildPostId ? "Update public build" : "Post public build"}
                onPress={() => router.push(`/car/${id}/build`)}
              />
              {car.buildPostId && (
                <ListRow
                  icon="eye-off"
                  label="Take down public build"
                  danger
                  showChevron={false}
                  onPress={takeDownBuild}
                />
              )}
            </ListGroup>
          </Section>

          <Section
            title="Service log"
            action={
              car.records.length > 0
                ? { label: "Log", hint: "Log a service", onPress: logService }
                : undefined
            }
          >
            {car.records.length === 0 ? (
              <EmptyState
                title="No services logged"
                body="Log one and its reminder counts from that date and mileage."
                action={<Button label="Log a service" kind="secondary" onPress={logService} />}
              />
            ) : (
              <View>
                <Text style={styles.summary}>
                  {car.records.length} {car.records.length === 1 ? "record" : "records"}
                  {spent > 0 ? `, ${formatMoney(String(spent))} spent` : ""}
                </Text>
                {car.records.map((r, i) => (
                  <RecordRow
                    key={r.id}
                    carId={id}
                    record={r}
                    photos={car.photos.filter((p) => p.recordId === r.id)}
                    photoLimit={car.photoLimit}
                    newest={i === 0}
                    last={i === car.records.length - 1}
                    onChange={reload}
                  />
                ))}
              </View>
            )}
            <ListGroup>
              <ListRow
                icon="upload"
                label="Import past services"
                onPress={() => router.push(`/car/${id}/history`)}
              />
              {car.records.length > 0 && (
                <ListRow
                  icon="file-text"
                  label="Share history as a PDF"
                  showChevron={false}
                  busy={exporting}
                  onPress={exportPdf}
                />
              )}
            </ListGroup>
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
      <PhotoViewer
        photos={heroPhotos}
        index={viewing}
        onClose={() => setViewing(null)}
        actions={(photo) => (
          <Button
            label="Crop or rotate"
            kind="secondary"
            style={styles.viewerAction}
            onPress={() => recropPhoto(photo)}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.asphalt },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFrame: {
    overflow: "hidden",
    backgroundColor: colors.panel,
    justifyContent: "flex-end",
  },
  noHero: { flex: 1, alignItems: "center", justifyContent: "center" },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  bottomScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
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
  name: {
    color: colors.chalk,
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: tracking(32),
  },
  fullName: {
    color: colors.label,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  onPhoto: { color: photoInk },
  onPhotoMuted: { color: photoInkMuted },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(colors.graphite, 0.8),
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
  odometerRow: { flexDirection: "row", alignItems: "center", gap: space.md },
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
  quickActionPressed: {
    backgroundColor: colors.graphite,
    transform: [{ scale: 0.97 }],
  },
  quickLabel: {
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  section: { gap: space.md, marginTop: space.sm },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
  },
  sectionActionLabel: {
    color: colors.amber,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  panel: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
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
  reminderSide: { alignItems: "flex-end", gap: space.sm },
  reminderChoices: { gap: space.sm },
  rowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  rowButtonPressed: { backgroundColor: colors.graphite },
  rowButtonLabel: {
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  facts: {
    color: colors.steel,
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  summary: {
    marginBottom: space.md,
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  swipeAction: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: colors.amberFill,
  },
  swipeLabel: { color: colors.onAmber, fontFamily: fonts.bold, fontSize: 14 },
  stats: { flexDirection: "row", gap: space.sm },
  stat: {
    flex: 1,
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  statValue: {
    color: colors.chalk,
    fontFamily: fonts.mono,
    fontSize: 16,
    lineHeight: 22,
  },
  statLabel: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  mod: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  modMain: { gap: 2 },
  removed: { color: colors.steel, textDecorationLine: "line-through" },
  modHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  modStatus: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  record: { flexDirection: "row", gap: space.md },
  rail: { width: 12, alignItems: "center", paddingTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.edge },
  dotNewest: { backgroundColor: colors.amber },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: space.xs,
    backgroundColor: colors.rule,
  },
  recordBody: { flex: 1, paddingBottom: space.xl },
  recordMain: { gap: 2 },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 28,
  },
  hintLabel: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  details: { gap: space.md, paddingTop: space.sm },
  notes: {
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  parts: { gap: space.xs },
  partsLabel: {
    color: colors.label,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  part: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 44,
    paddingVertical: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.rule,
  },
  partText: { flex: 1, gap: 2 },
  partName: {
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  detailActions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  recordDate: {
    color: colors.steel,
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: { opacity: 0.7 },
  viewerAction: { flex: 1 },
  rowTitle: {
    flexShrink: 1,
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  rowDetail: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
