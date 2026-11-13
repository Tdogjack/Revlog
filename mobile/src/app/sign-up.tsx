import { Feather } from "@expo/vector-icons";
import type { Tokens } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthPage, authStyles, openSite } from "@/components/auth-page";
import { Field } from "@/components/fields";
import { ProviderButtons } from "@/components/provider-buttons";
import { Body, Button, FormError } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, space } from "@/lib/theme";

// Same rules and wording as the website's sign-up checklist.
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
];

const logInLink = (
  <>
    Already have an account?{" "}
    <Text
      style={authStyles.link}
      accessibilityRole="link"
      onPress={() => router.back()}
    >
      Log in
    </Text>
  </>
);

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
      <AuthPage heading="Check your email" footer={logInLink}>
        <Body>
          We sent a link to confirm your account. Open it, then log in.
        </Body>
      </AuthPage>
    );
  }

  return (
    <AuthPage heading="Create your garage" footer={logInLink}>
      <View style={styles.group}>
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="redline_rob"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          maxLength={21}
          validate={(v) => (v.trim() ? null : "Choose a username.")}
        />
        <Text style={authStyles.hint}>
          Shown on your community posts. 3 to 20 characters: letters, numbers,
          and underscores.
        </Text>
      </View>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        validate={(v) =>
          /.+@.+\..+/.test(v.trim())
            ? null
            : "Enter an email like name@domain.com."
        }
      />
      <View style={styles.group}>
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={72}
        />
        <View style={styles.rules}>
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <View
                key={rule.label}
                style={styles.rule}
                accessible
                accessibilityLabel={`${rule.label}, ${met ? "done" : "missing"}`}
              >
                <Feather
                  name={met ? "check" : "circle"}
                  size={14}
                  color={met ? colors.done : colors.steel}
                />
                <Text style={[styles.ruleText, met && styles.ruleMet]}>
                  {rule.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.agreeRow}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agree }}
          accessibilityLabel="I agree to the Terms and Privacy Policy"
          hitSlop={10}
          style={[styles.box, agree && styles.boxOn]}
          onPress={() => setAgree(!agree)}
        >
          {agree && <Feather name="check" size={16} color={colors.onAmber} />}
        </Pressable>
        <Text style={styles.agree}>
          I agree to the{" "}
          <Text
            style={styles.inlineLink}
            accessibilityRole="link"
            onPress={() => openSite("/terms")}
          >
            Terms
          </Text>{" "}
          and{" "}
          <Text
            style={styles.inlineLink}
            accessibilityRole="link"
            onPress={() => openSite("/privacy")}
          >
            Privacy Policy
          </Text>
          , including no abusive or objectionable content.
        </Text>
      </View>
      <FormError message={error} />
      <Button label="Create account" busy={busy} onPress={submit} />
      <ProviderButtons />
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.xs },
  rules: { gap: space.xs, paddingTop: space.xs },
  rule: { flexDirection: "row", alignItems: "center", gap: 6 },
  ruleText: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  ruleMet: { color: colors.done },
  agreeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    minHeight: 44,
  },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.fieldEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: colors.amberFill, borderColor: colors.amberFill },
  agree: {
    flex: 1,
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineLink: { color: colors.amber, fontFamily: fonts.bold },
});
