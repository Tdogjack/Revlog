import type { EmailSettings } from "@revlog/api";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { Body, Button, FormError, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pushPermission, registerForPush, type PushStatus } from "@/lib/push";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function Form({ initial }: { initial: EmailSettings }) {
  const [enabled, setEnabled] = useState(initial.reminderEmails);
  const [percent, setPercent] = useState(initial.reminderPercent?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [push, setPush] = useState(initial.pushReminders);
  const [permission, setPermission] = useState<PushStatus | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    pushPermission().then(setPermission).catch(() => setPermission("unavailable"));
  }, []);

  // Turning push on asks for permission first if the phone hasn't allowed it.
  const togglePush = async (next: boolean) => {
    setPush(next);
    if (!next || permission === "on") return;
    try {
      setPermission(await registerForPush({ ask: true }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await api("/me/email-settings", {
        method: "PUT",
        body: { reminderEmails: enabled, reminderPercent: percent, pushReminders: push },
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

  const sendTestPush = async () => {
    setTestingPush(true);
    setNotice(null);
    setError(null);
    try {
      const { message } = await api<{ message: string }>("/me/push-token/test", {
        method: "POST",
        body: {},
      });
      setNotice(message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <Screen>
      {permission !== "unavailable" && (
        <>
          <View style={styles.setting}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Push notifications</Text>
              <Body style={styles.hint}>
                A notification on this phone when a service is due soon, and weekly while
                it&apos;s overdue.
              </Body>
            </View>
            <Switch
              accessibilityLabel="Push notifications"
              value={push && permission === "on"}
              trackColor={{ true: colors.amber, false: colors.graphite }}
              onValueChange={togglePush}
            />
          </View>
          {push && permission === "denied" && (
            <Body style={styles.hint}>
              Notifications are off for Revlog in your phone&apos;s settings.{" "}
              <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openSettings()}>
                Open Settings
              </Text>
            </Body>
          )}
        </>
      )}
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
      {permission === "on" && push && (
        <Button
          label="Send me a test notification"
          kind="secondary"
          busy={testingPush}
          onPress={sendTestPush}
        />
      )}
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
  link: { color: colors.amber, fontFamily: fonts.medium },
  notice: { color: colors.done, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
});
