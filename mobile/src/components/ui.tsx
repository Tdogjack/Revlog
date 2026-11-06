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
import { colors, fonts, MAX_WIDTH, space, statusStyles } from "@/lib/theme";

export function Screen({
  children,
  refreshControl,
  scrollRef,
}: {
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  scrollRef?: React.Ref<React.ComponentRef<typeof ScrollView>>;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
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

// The mileage, set like the numbers on a dash. The one loud thing on a screen.
export function Odometer({ miles, large = false }: { miles: number; large?: boolean }) {
  return (
    <Text
      style={[styles.odometer, large && styles.odometerLarge]}
      accessibilityLabel={`${miles.toLocaleString("en-US")} miles`}
    >
      {miles.toLocaleString("en-US")}
      <Text style={styles.odometerUnit}> mi</Text>
    </Text>
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
      onPress={busy ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
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

export function StatusLabel({ status }: { status: ReminderStatus }) {
  const { text, label } = statusStyles[status];
  return <Text style={[styles.status, { color: text }]}>{label}</Text>;
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
  odometer: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 18, lineHeight: 24 },
  odometerLarge: { color: colors.amber, fontSize: 44, lineHeight: 52, letterSpacing: -1 },
  odometerUnit: { color: colors.steel, fontFamily: fonts.regular, fontSize: 15 },
  button: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
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
