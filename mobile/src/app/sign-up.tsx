import { Feather } from "@expo/vector-icons";
import type { Tokens } from "@revlog/api";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";
import { colors, fonts, space } from "@/lib/theme";

export default function SignUp() {
  const { acceptTokens } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { tokens } = await api<{ tokens: Tokens | null }>("/auth/signup", {
        method: "POST",
        body: { username, email: email.trim(), password, agree },
      });
      if (tokens) await acceptTokens(tokens);
      else setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <Body>Check your email for a link to confirm your account, then log in.</Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        validate={(v) => (v.trim() ? null : "Choose a username.")}
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        validate={(v) => (/.+@.+\..+/.test(v.trim()) ? null : "Enter an email like name@domain.com.")}
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Body style={styles.hint}>
        At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
      </Body>
      <View style={styles.agreeRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agree }}
          accessibilityLabel="I agree to the Terms and Privacy Policy"
          hitSlop={8}
          style={[styles.box, agree && styles.boxOn]}
          onPress={() => setAgree(!agree)}
        >
          {agree && <Feather name="check" size={18} color={colors.onAmber} />}
        </Pressable>
        <Text style={styles.agree}>
          I agree to the{" "}
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
      <FormError message={error} />
      <Button label="Create account" busy={busy} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  agreeRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 44 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.fieldEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.amber, borderColor: colors.amber },
  agree: { flex: 1, color: colors.chalk, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  link: { color: colors.amber, textDecorationLine: "underline" },
});
