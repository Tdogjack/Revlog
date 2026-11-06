import { router } from "expo-router";
import { useState } from "react";
import { Field } from "@/components/fields";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Username() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api("/me/username", { method: "POST", body: { username } });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Body style={{ color: colors.steel }}>
        This is how you appear on posts and comments. It can&apos;t be changed later.
      </Body>
      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={20}
      />
      <FormError message={error} />
      <Button label="Save username" busy={saving} onPress={save} />
    </Screen>
  );
}
