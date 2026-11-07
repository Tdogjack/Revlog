import type { Me } from "@revlog/api";
import * as WebBrowser from "expo-web-browser";
import { useRef, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, FormError } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { colors, fonts, MAX_WIDTH, radius, space } from "@/lib/theme";

// Asks before anything is sent to the AI service, in the website's words.
// `ensure()` resolves true once the person has allowed it, now or earlier, and
// false if they say no. Render `dialog` anywhere in the component using it.
export function useAiConsent() {
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = useRef(false);
  const answer = useRef<(ok: boolean) => void>(() => {});

  const ensure = async () => {
    if (allowed.current) return true;
    allowed.current = (await api<Me>("/me")).aiConsent;
    if (allowed.current) return true;
    setError(null);
    setAsking(true);
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  };

  const finish = (ok: boolean) => {
    setAsking(false);
    answer.current(ok);
  };

  const allow = async () => {
    setSaving(true);
    setError(null);
    try {
      await api("/me/ai-consent", { method: "POST", body: {} });
      allowed.current = true;
      finish(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const dialog = (
    <Modal transparent visible={asking} animationType="fade" onRequestClose={() => finish(false)}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            Send this to Anthropic&apos;s AI?
          </Text>
          <Body style={styles.muted}>
            Revlog uses Anthropic, an AI company, to read your files. Each file you scan goes to
            Anthropic, along with anything in it, such as your name, address, VIN, or what you paid.
          </Body>
          <Body style={styles.muted}>
            Anthropic reads it and sends back the details for you to check. It doesn&apos;t use your
            files to train its AI. You can turn this off in Account.
          </Body>
          <Button
            label="Read the privacy policy"
            kind="secondary"
            onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/privacy#ai-scanning`)}
          />
          <FormError message={error} />
          <Button label="Allow and scan" busy={saving} onPress={allow} />
          <Button label="Don't send" kind="secondary" onPress={() => finish(false)} />
        </View>
      </SafeAreaView>
    </Modal>
  );

  return { ensure, dialog };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: space.lg,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  card: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  title: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  muted: { color: colors.label },
});
