import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button, FormError } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";
import { colors, fonts, space } from "@/lib/theme";

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </Svg>
  );
}

function AppleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessible={false}>
      <Path
        fill={colors.chalk}
        d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.35 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.38-3.69ZM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.68-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.68-1.28Z"
      />
    </Svg>
  );
}

// Google and Apple sign-in, under the email form. On iPhone, Apple uses the
// system's own sheet; elsewhere it goes through the browser.
export function ProviderButtons() {
  const { signInWith } = useAuth();
  const [appleSheet, setAppleSheet] = useState(false);
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleSheet)
      .catch(() => setAppleSheet(false));
  }, []);

  // The website has its own buttons; this is for the phone app.
  if (Platform.OS === "web") return null;

  const start = async (provider: "google" | "apple", via: "sheet" | "browser") => {
    setBusy(provider);
    setError(null);
    try {
      // On success the app moves on to the garage, so only reset on failure or cancel.
      if (!(await signInWith(provider, via))) setBusy(null);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no">
        <View style={styles.rule} />
        <Text style={styles.or}>or</Text>
        <View style={styles.rule} />
      </View>
      <Button
        label="Continue with Google"
        kind="secondary"
        icon={<GoogleLogo />}
        busy={busy === "google"}
        onPress={() => busy || start("google", "browser")}
      />
      {/* Apple allows a custom button with its logo; the sheet itself is Apple's. */}
      <Button
        label="Continue with Apple"
        kind="secondary"
        icon={<AppleLogo />}
        busy={busy === "apple"}
        onPress={() => busy || start("apple", appleSheet ? "sheet" : "browser")}
      />
      <FormError message={error} />
      <Text style={styles.terms}>
        New here? Continuing with Google or Apple means you agree to the{" "}
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/terms`)}
        >
          Terms
        </Text>{" "}
        and{" "}
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/privacy`)}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.edge },
  or: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14 },
  terms: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  link: { color: colors.amber, textDecorationLine: "underline" },
});
