import { Feather } from "@expo/vector-icons";
import type { ReminderStatus } from "@revlog/api";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { pressFeedback, tapFeedback } from "@/lib/haptics";
import { colors, fonts, MAX_WIDTH, radius, space, statusStyles } from "@/lib/theme";

export function Screen({
  children,
  refreshControl,
  scrollRef,
  avoidKeyboard = true,
}: {
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>>;
  // Off when something pinned below the screen moves with the keyboard instead.
  avoidKeyboard?: boolean;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      enabled={avoidKeyboard}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
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
export function Odometer({ miles, large = false }: { miles: number; large?: boolean }) {
  const digits = String(Math.max(0, Math.round(miles))).padStart(6, "0").split("");
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
      <Text style={[styles.odometerUnit, large && styles.odometerUnitLarge]}>mi</Text>
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

export function ListRow({
  icon,
  label,
  danger = false,
  showChevron = true,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  danger?: boolean;
  showChevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Feather name={icon} size={20} color={danger ? colors.overdue : colors.amber} />
      <Text style={[styles.listLabel, danger && styles.buttonLabelDanger]}>{label}</Text>
      {showChevron && <Feather name="chevron-right" size={20} color={colors.placeholder} />}
    </Pressable>
  );
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy }}
      accessibilityLabel={label}
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
        pressed && styles.buttonPressed,
        pressed && (primary ? styles.buttonPrimaryPressed : styles.buttonSecondaryPressed),
        style,
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
  heading: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
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
  wheelLast: { backgroundColor: colors.amber },
  digit: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 16, lineHeight: 22 },
  digitLarge: { fontSize: 30, lineHeight: 38 },
  digitUnused: { color: colors.placeholder },
  digitLast: { color: colors.onAmber },
  odometerUnit: {
    marginLeft: space.xs,
    color: colors.label,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  odometerUnitLarge: { marginLeft: space.sm, fontSize: 16 },
  pill: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
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
  group: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  listRowPressed: { backgroundColor: colors.graphite },
  listLabel: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 16 },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonPrimary: { backgroundColor: colors.amber },
  buttonPrimaryPressed: { backgroundColor: colors.amberPressed },
  buttonSecondary: { borderWidth: 1, borderColor: colors.edge },
  buttonSecondaryPressed: { backgroundColor: colors.panel },
  buttonLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16 },
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
  emptyTitle: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 17, lineHeight: 24 },
});
