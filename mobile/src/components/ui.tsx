import { Feather } from "@expo/vector-icons";
import type { ReminderStatus } from "@revlog/api";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import {
  KeyboardAwareScrollView,
  KeyboardController,
  KeyboardStickyView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import {
  colors,
  fonts,
  MAX_WIDTH,
  photoInkMuted,
  radius,
  space,
  springs,
  statusStyles,
  tracking,
} from "@/lib/theme";

export function Screen({
  children,
  refreshControl,
  scrollRef,
  avoidKeyboard = true,
  bottomSpace,
}: {
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  scrollRef?: React.Ref<React.ComponentRef<typeof KeyboardAwareScrollView>>;
  // Off when something pinned below the screen moves with the keyboard instead.
  avoidKeyboard?: boolean;
  // Extra room under the content, for something floating over the page.
  bottomSpace?: number;
}) {
  const [numberPadUp, setNumberPadUp] = useState(false);
  return (
    <NumberPadContext.Provider value={setNumberPadUp}>
      {/* Keeps the focused field clear of the keyboard and its toolbar. */}
      <KeyboardAwareScrollView
        ref={scrollRef}
        enabled={avoidKeyboard}
        bottomOffset={avoidKeyboard ? TOOLBAR_CLEARANCE : 0}
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        refreshControl={refreshControl}
      >
        <View style={[styles.column, bottomSpace != null && { paddingBottom: bottomSpace }]}>
          {children}
        </View>
      </KeyboardAwareScrollView>
      {avoidKeyboard && <FormToolbar numberPadNext={numberPadUp} />}
    </NumberPadContext.Provider>
  );
}

// Fields tell their screen when a number pad opens, since iOS number pads
// have no return key to move on with.
const NumberPadContext = createContext<(up: boolean) => void>(() => {});
export const useNumberPadFocus = () => useContext(NumberPadContext);

const TOOLBAR_HEIGHT = 42;
// Room between the focused field and the top of the toolbar, or of the
// Next button above it.
const TOOLBAR_CLEARANCE = TOOLBAR_HEIGHT + 48 + space.lg;

const toolbarColors = {
  primary: colors.amber,
  disabled: colors.edge,
  background: colors.panel,
  ripple: colors.graphite,
};

// Previous, Next and Done, riding on top of the keyboard for every text box.
// The toolbar stays put; on a number pad a Next button sits just above it.
export function FormToolbar({ numberPadNext = false }: { numberPadNext?: boolean }) {
  return (
    <>
      {numberPadNext && (
        <KeyboardStickyView
          style={styles.nextHolder}
          offset={{ closed: 0, opened: -(TOOLBAR_HEIGHT + space.sm) }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next field"
            style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
            onPress={() => {
              tapFeedback();
              KeyboardController.setFocusTo("next");
            }}
          >
            <Text style={styles.nextLabel}>Next</Text>
            <Feather name="arrow-down" size={18} color={colors.onAmber} />
          </Pressable>
        </KeyboardStickyView>
      )}
      <KeyboardToolbar theme={{ light: toolbarColors, dark: toolbarColors }} />
    </>
  );
}

export function Body({ style, children }: { style?: StyleProp<TextStyle>; children: ReactNode }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.heading} accessibilityRole="header">
      {children}
    </Text>
  );
}

// The mileage, set on wheels like a real odometer, last digit lit.
export function Odometer({
  miles,
  large = false,
  onPhoto = false,
}: {
  miles: number;
  large?: boolean;
  // Set over a car photo, where the unit needs the photo's ink.
  onPhoto?: boolean;
}) {
  const digits = String(Math.max(0, Math.round(miles)))
    .padStart(6, "0")
    .split("");
  const firstReal = digits.findIndex((d) => d !== "0");
  return (
    <View
      accessible
      accessibilityLabel={`${miles.toLocaleString("en-US")} miles`}
      style={styles.odometer}
    >
      {digits.map((digit, i) => {
        const last = i === digits.length - 1;
        const unused = firstReal === -1 ? !last : i < firstReal;
        return (
          <View
            key={i}
            style={[styles.wheel, large && styles.wheelLarge, last && styles.wheelLast]}
          >
            <Text
              style={[
                styles.digit,
                large && styles.digitLarge,
                unused && styles.digitUnused,
                last && styles.digitLast,
              ]}
            >
              {digit}
            </Text>
          </View>
        );
      })}
      <Text
        style={[
          styles.odometerUnit,
          large && styles.odometerUnitLarge,
          onPhoto && { color: photoInkMuted },
        ]}
      >
        mi
      </Text>
    </View>
  );
}

export function StatusPill({ status, count = 1 }: { status: ReminderStatus; count?: number }) {
  const { text, bg, label } = statusStyles[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.status, { color: text }]}>
        {count > 1 ? `${count} ${label.toLowerCase()}` : label}
      </Text>
    </View>
  );
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      <Text style={[styles.avatarLetter, large && styles.avatarLetterLarge]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Settings-style rows, grouped on one panel.
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

// Names a group of rows, like "Settings" above the settings.
export function GroupLabel({ children }: { children: string }) {
  return (
    <Text style={styles.groupLabel} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function ListRow({
  icon,
  label,
  detail,
  danger = false,
  showChevron = true,
  busy = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  // The current value, shown quietly at the end of the row.
  detail?: string;
  danger?: boolean;
  showChevron?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  if (busy) {
    return (
      <View style={styles.listRow} accessibilityState={{ busy: true }} accessibilityLabel={label}>
        <ActivityIndicator color={colors.amber} style={styles.listSpinner} />
        <Text style={styles.listLabel}>{label}</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Feather name={icon} size={20} color={danger ? colors.overdue : colors.amber} />
      <Text style={[styles.listLabel, danger && styles.buttonLabelDanger]}>{label}</Text>
      {detail && <Text style={styles.listDetail}>{detail}</Text>}
      {showChevron && <Feather name="chevron-right" size={20} color={colors.placeholder} />}
    </Pressable>
  );
}

// A press that sinks the moment a finger lands and springs back on release.
// The spring starts from wherever the scale is, so quick taps never jump.
export function usePressScale(depth = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => scale.set(withSpring(depth, springs.snappy)),
    onPressOut: () => scale.set(withSpring(1, springs.settle)),
  };
}

export function Button({
  label,
  onPress,
  kind = "primary",
  busy = false,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger";
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = kind === "primary";
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy }}
        accessibilityLabel={label}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        // Stays tappable; a second tap while saving just does nothing.
        onPress={
          busy
            ? undefined
            : () => {
                pressFeedback();
                onPress();
              }
        }
        style={({ pressed }) => [
          styles.button,
          primary ? styles.buttonPrimary : styles.buttonSecondary,
          pressed && (primary ? styles.buttonPrimaryPressed : styles.buttonSecondaryPressed),
        ]}
      >
        {busy ? (
          <ActivityIndicator color={primary ? colors.onAmber : colors.chalk} />
        ) : (
          <Text
            style={[
              styles.buttonLabel,
              primary && styles.buttonLabelPrimary,
              kind === "danger" && styles.buttonLabelDanger,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.formError} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.amber} accessibilityLabel="Loading" />
    </View>
  );
}

export function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Body style={styles.centerText}>{message}</Body>
      <Button label="Try again" kind="secondary" onPress={onRetry} />
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Body style={styles.muted}>{body}</Body>
      {action}
    </View>
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.asphalt },
  nextHolder: { position: "absolute", right: space.lg, bottom: 0 },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: 22,
    backgroundColor: colors.amberFill,
  },
  nextButtonPressed: { backgroundColor: colors.amberPressed, transform: [{ scale: 0.96 }] },
  nextLabel: { color: colors.onAmber, fontFamily: fonts.bold, fontSize: 16 },
  scroll: { flexGrow: 1, alignItems: "center" },
  column: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
  },
  body: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.steel },
  heading: {
    color: colors.chalk,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: tracking(22),
  },
  odometer: { flexDirection: "row", alignItems: "center", gap: 2 },
  wheel: {
    width: 20,
    height: 28,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.graphite,
  },
  wheelLarge: { width: 38, height: 54, borderRadius: radius.sm },
  wheelLast: { backgroundColor: colors.amberFill },
  digit: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 16, lineHeight: 22 },
  digitLarge: { fontSize: 30, lineHeight: 38 },
  digitUnused: { color: colors.placeholder },
  digitLast: { color: colors.onAmber },
  odometerUnit: {
    marginLeft: space.xs,
    color: colors.label,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  odometerUnitLarge: { marginLeft: space.sm, fontSize: 16 },
  pill: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderCurve: "continuous",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.graphite,
  },
  avatarLarge: { width: 64, height: 64, borderRadius: 32 },
  avatarLetter: { color: colors.amber, fontFamily: fonts.bold, fontSize: 15 },
  avatarLetterLarge: { fontSize: 28 },
  group: {
    borderRadius: radius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.graphite,
  },
  listRowPressed: { backgroundColor: colors.graphite },
  listLabel: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 16 },
  listDetail: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15 },
  listSpinner: { width: 20 },
  groupLabel: {
    marginBottom: -space.sm,
    paddingHorizontal: space.xs,
    color: colors.steel,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.amberFill },
  buttonPrimaryPressed: { backgroundColor: colors.amberPressed },
  buttonSecondary: { borderWidth: 1, borderColor: colors.edge },
  buttonSecondaryPressed: { backgroundColor: colors.panel },
  buttonLabel: {
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 17,
    letterSpacing: tracking(17),
  },
  buttonLabelPrimary: { color: colors.onAmber, fontFamily: fonts.bold },
  buttonLabelDanger: { color: colors.overdue },
  status: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  formError: { color: colors.overdue, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  center: {
    flex: 1,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
    padding: space.xl,
    backgroundColor: colors.asphalt,
  },
  centerText: { textAlign: "center", color: colors.steel },
  empty: { gap: space.sm, paddingVertical: space.lg },
  emptyTitle: {
    color: colors.chalk,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: tracking(20),
  },
});
