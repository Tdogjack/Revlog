import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAiConsent } from "@/components/ai-consent";
import { Body, FormError } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pressFeedback } from "@/lib/haptics";
import { choosePhoto } from "@/lib/photos";
import { colors, fonts, radius, space } from "@/lib/theme";

// The scan panel at the top of the service and mod forms. Reads a photo and
// hands the values back for the person to check; nothing is saved here.
export function ScanBox<T>({
  path,
  label,
  intro,
  canUpload,
  onScanned,
}: {
  path: string;
  label: string;
  intro: string;
  canUpload: boolean;
  onScanned: (data: T, photoUri: string) => void;
}) {
  const consent = useAiConsent();
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    pressFeedback();
    setError(null);
    setDone(false);
    if (!canUpload) {
      Alert.alert("Confirm your email", "Confirm your email to scan photos. Resend the link from Account.");
      return;
    }
    try {
      if (!(await consent.ensure())) return;
      const photo = await choosePhoto();
      if (!photo) return;
      setScanning(true);
      onScanned(await api<T>(path, { method: "POST", form: photo.form }), photo.uri);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.box}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: scanning }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={scanning ? undefined : scan}
      >
        {scanning ? (
          <ActivityIndicator color={colors.amber} />
        ) : (
          <Feather name="camera" size={20} color={colors.amber} />
        )}
        <Text style={styles.label}>{scanning ? "Reading photo" : label}</Text>
      </Pressable>
      <Body style={styles.hint}>{intro} Scans are read by Anthropic&apos;s AI.</Body>
      {done && (
        <Text style={styles.done} accessibilityLiveRegion="polite">
          Filled in from the photo. Check each field before saving.
        </Text>
      )}
      <FormError message={error} />
      {consent.dialog}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.panel },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  // Secondary, so the form's own save stays the one amber button.
  pressed: { backgroundColor: colors.graphite, transform: [{ scale: 0.98 }] },
  label: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  done: { color: colors.done, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
