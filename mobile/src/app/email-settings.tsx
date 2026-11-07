import type { EmailSettings } from "@revlog/api";
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { Body, Button, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function Form({ initial }: { initial: EmailSettings }) {
  const [enabled, setEnabled] = useState(initial.reminderEmails);
  const [percent, setPercent] = useState(initial.reminderPercent?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await api("/me/email-settings", {
        method: "PUT",
        body: { reminderEmails: enabled, reminderPercent: percent },
      });
      setNotice("Saved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setNotice(null);
    setError(null);
    try {
      const { message } = await api<{ message: string }>("/me/email-settings/test", {
        method: "POST",
        body: {},
      });
      setNotice(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.setting}>
        <View style={styles.settingText}>
          <Text style={styles.label}>Reminder emails</Text>
          <Body style={styles.hint}>
            Get an email when a service is due soon, and again weekly while it&apos;s overdue.
          </Body>
        </View>
        <Switch
          accessibilityLabel="Reminder emails"
          value={enabled}
          trackColor={{ true: colors.amber, false: colors.graphite }}
          onValueChange={setEnabled}
        />
      </View>
      <Field
        label="Due soon at this percent of the miles driven"
        placeholder="80"
        value={percent}
        onChangeText={setPercent}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Body style={styles.hint}>
        With 80%, a 5,000 mi oil change turns due soon and emails you at 4,000 mi. Leave blank for
        the default: 500 mi or 14 days before it&apos;s due.
      </Body>
      <FormError message={error} />
      {notice && (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      )}
      <Button label="Save changes" busy={saving} onPress={save} />
      <Button label="Send me a test email" kind="secondary" busy={testing} onPress={sendTest} />
    </Screen>
  );
}

export default function EmailSettingsScreen() {
  const { data, error, reload } = useApi<EmailSettings>("/me/email-settings");
  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;
  return <Form initial={data} />;
}

const styles = StyleSheet.create({
  setting: { flexDirection: "row", alignItems: "center", gap: space.md },
  settingText: { flex: 1, gap: 2 },
  label: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 16 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  notice: { color: colors.done, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
