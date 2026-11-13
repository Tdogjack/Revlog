import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { AuthPage, authStyles, openSite } from "@/components/auth-page";
import { Field } from "@/components/fields";
import { ProviderButtons } from "@/components/provider-buttons";
import { Button, FormError } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
    <AuthPage
      heading="Log in to your garage"
      footer={
        <>
          New to Revlog?{" "}
          <Text
            style={authStyles.link}
            accessibilityRole="link"
            onPress={() => router.push("/sign-up")}
          >
            Create an account
          </Text>
        </>
      }
    >
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
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
        labelAccessory={
          <Pressable
            accessibilityRole="link"
            hitSlop={12}
            onPress={() => openSite("/forgot-password")}
          >
            <Text style={authStyles.link}>Forgot password?</Text>
          </Pressable>
        }
      />
      <FormError message={error} />
      <Button label="Log in" busy={busy} onPress={submit} />
      <ProviderButtons />
    </AuthPage>
  );
}
