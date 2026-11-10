import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Field } from "@/components/fields";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

// The same rules the server checks, so the hint under the field is honest.
const RULES = [
  { label: "8 characters", test: (p: string) => p.length >= 8 },
  { label: "an uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "a lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "a number", test: (p: string) => /\d/.test(p) },
];

const missing = (password: string) => {
  const needs = RULES.filter((r) => !r.test(password)).map((r) => r.label);
  return needs.length > 0 ? `Your password still needs ${needs.join(", ")}.` : null;
};

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const problem =
      missing(password) ?? (password === confirm ? null : "The two passwords don't match.");
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api("/me/password", { method: "POST", body: { password, confirm } });
      Alert.alert("Password changed", "Use the new password the next time you log in.");
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Body style={{ color: colors.steel }}>
        Use at least 8 characters, with an uppercase letter, a lowercase letter, and a number.
      </Body>
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        validate={missing}
      />
      <Field
        label="New password again"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        validate={(value) => (value === password ? null : "The two passwords don't match.")}
        onSubmitEditing={save}
      />
      <FormError message={error} />
      <Button label="Change password" busy={saving} onPress={save} />
    </Screen>
  );
}
