import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field } from "@/components/fields";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";
import { colors, fonts, space } from "@/lib/theme";

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <Screen>
        <View style={styles.intro}>
          <Text style={styles.brand} accessibilityRole="header">
            Revlog
          </Text>
          <Body style={styles.muted}>Every service and mod, kept with the car.</Body>
        </View>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
        />
        <FormError message={error} />
        <Button label="Log in" busy={busy} onPress={submit} />
        <Button
          label="Forgot password"
          kind="secondary"
          onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/forgot-password`)}
        />
        <Button label="Create an account" kind="secondary" onPress={() => router.push("/sign-up")} />
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.asphalt },
  intro: { gap: space.xs, paddingTop: space.xxl, paddingBottom: space.lg },
  brand: { color: colors.amber, fontFamily: fonts.bold, fontSize: 40, lineHeight: 48 },
  muted: { color: colors.steel },
});
