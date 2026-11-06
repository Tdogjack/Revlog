import type { ModerationQueue, OpenReport } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Button,
  EmptyState,
  Heading,
  LoadFailed,
  Loading,
  Screen,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function ReportRow({ report, onDone }: { report: OpenReport; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  const act = async (action: "dismiss" | "remove" | "suspend") => {
    setBusy(true);
    try {
      await api(`/moderation/reports/${report.id}`, { method: "POST", body: { action } });
      await onDone();
    } catch (err) {
      Alert.alert("That didn't work", errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: label, style: "destructive", onPress: run },
    ]);

  const removable = report.targetType !== "user" && !report.gone;

  return (
    <View style={styles.report}>
      <Text style={styles.reason}>{report.reason}</Text>
      <Text style={styles.meta}>
        {report.targetType} by @{report.reportedUsername}
        {report.reporter ? `, reported by @${report.reporter}` : ""}
      </Text>
      {report.gone && <Text style={styles.meta}>Already deleted.</Text>}
      {report.contentSnapshot && <Body>{report.contentSnapshot}</Body>}
      {report.details && <Body style={styles.details}>{report.details}</Body>}
      {report.targetType === "post" && !report.gone && (
        <Button
          label="Open post"
          kind="secondary"
          onPress={() => router.push(`/post/${report.targetId}`)}
        />
      )}
      <Button label="Dismiss report" kind="secondary" busy={busy} onPress={() => act("dismiss")} />
      {removable && (
        <Button
          label={`Remove ${report.targetType}`}
          kind="danger"
          onPress={() =>
            confirm(
              `Remove this ${report.targetType}?`,
              "It's deleted for everyone.",
              `Remove ${report.targetType}`,
              () => act("remove"),
            )
          }
        />
      )}
      {report.reportedUserId && (
        <Button
          label={`Suspend @${report.reportedUsername}`}
          kind="danger"
          onPress={() =>
            confirm(
              `Suspend @${report.reportedUsername}?`,
              "Their posts and comments are hidden, and they can't post. Their garage isn't touched.",
              "Suspend account",
              () => act("suspend"),
            )
          }
        />
      )}
    </View>
  );
}

export default function Moderation() {
  const { data, error, reload } = useApi<ModerationQueue>("/moderation");

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const restore = async (userId: string) => {
    try {
      await api(`/moderation/users/${userId}`, { method: "POST", body: { action: "restore" } });
      await reload();
    } catch (err) {
      Alert.alert("Account not restored", errorMessage(err));
    }
  };

  return (
    <Screen>
      <Heading>Reports</Heading>
      {data.reports.length === 0 ? (
        <EmptyState title="No open reports" body="New reports show here and by email." />
      ) : (
        data.reports.map((report) => (
          <ReportRow key={report.id} report={report} onDone={reload} />
        ))
      )}
      <Heading>Suspended accounts</Heading>
      {data.suspended.length === 0 ? (
        <Body style={styles.muted}>No accounts are suspended.</Body>
      ) : (
        data.suspended.map((user) => (
          <View key={user.userId} style={styles.suspended}>
            <Text style={styles.name}>@{user.username}</Text>
            <Button label="Restore" kind="secondary" onPress={() => restore(user.userId)} />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  report: {
    gap: space.sm,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  reason: { color: colors.overdue, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  details: { color: colors.label },
  muted: { color: colors.steel },
  suspended: { flexDirection: "row", alignItems: "center", gap: space.md },
  name: { flex: 1, color: colors.chalk, fontFamily: fonts.medium, fontSize: 16 },
});
