import { Feather } from "@expo/vector-icons";
import type { Me } from "@revlog/api";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import {
  Avatar,
  Body,
  Button,
  FormError,
  GroupLabel,
  Heading,
  ListGroup,
  ListRow,
  LoadFailed,
  Loading,
  Screen,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";
import { colors, fonts, paletteId, palettes, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function Account() {
  const { data, error, reload } = useApi<Me>("/me");
  const { signOut, forget } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const resend = async () => {
    try {
      const { alreadyConfirmed } = await api<{ alreadyConfirmed: boolean }>(
        "/me/resend-confirmation",
        { method: "POST", body: {} },
      );
      Alert.alert(
        alreadyConfirmed ? "Email confirmed" : "Link sent",
        alreadyConfirmed ? "Your email is already confirmed." : `Check ${data.email}.`,
      );
    } catch (err) {
      Alert.alert("Link not sent", errorMessage(err));
    }
  };

  const setAiScans = async (allowed: boolean) => {
    try {
      await api("/me/ai-consent", { method: allowed ? "POST" : "DELETE", body: {} });
      await reload();
    } catch (err) {
      Alert.alert("Setting not saved", errorMessage(err));
    }
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api("/me", { method: "DELETE", body: { confirm } });
      await forget();
    } catch (err) {
      setDeleteError(errorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.profile}>
        <Avatar name={data.username ?? data.email ?? "R"} large />
        <View style={styles.profileText}>
          {data.username && <Heading>@{data.username}</Heading>}
          <Body style={styles.muted}>{data.email}</Body>
        </View>
      </View>
      {!data.emailVerified && (
        <View style={styles.group}>
          <Body>Confirm your email to add photos.</Body>
          <Button label="Resend confirmation link" kind="secondary" onPress={resend} />
        </View>
      )}
      {!data.username && (
        <View style={styles.group}>
          <Body>Choose a username to post in the community.</Body>
          <Button label="Choose username" kind="secondary" onPress={() => router.push("/username")} />
        </View>
      )}

      <GroupLabel>Garage</GroupLabel>
      <ListGroup>
        <ListRow icon="bar-chart-2" label="Costs" onPress={() => router.push("/costs")} />
      </ListGroup>

      <GroupLabel>Community</GroupLabel>
      <ListGroup>
        {data.username && (
          <ListRow
            icon="user"
            label="Your posts"
            onPress={() => router.push(`/user/${data.username}`)}
          />
        )}
        <ListRow icon="slash" label="Blocked accounts" onPress={() => router.push("/blocked")} />
        {data.moderator && (
          <ListRow icon="shield" label="Moderation" onPress={() => router.push("/moderation")} />
        )}
      </ListGroup>

      <GroupLabel>Settings</GroupLabel>
      <ListGroup>
        <ListRow icon="bell" label="Reminders" onPress={() => router.push("/email-settings")} />
        <ListRow
          icon="droplet"
          label="Appearance"
          detail={palettes.find((p) => p.id === paletteId)?.name}
          onPress={() => router.push("/appearance")}
        />
        <ListRow icon="key" label="Change password" onPress={() => router.push("/change-password")} />
        <View style={styles.setting}>
          <Feather name="camera" size={20} color={colors.amber} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>AI scanning</Text>
            <Body style={styles.hint}>Scans you start are read by Anthropic&apos;s AI.</Body>
          </View>
          <Switch
            accessibilityLabel="Allow AI scanning"
            value={data.aiConsent}
            trackColor={{ true: colors.amber, false: colors.graphite }}
            thumbColor={colors.chalk}
            onValueChange={setAiScans}
          />
        </View>
        <ListRow
          icon="info"
          label="How scanning works"
          onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/privacy#ai-scanning`)}
        />
      </ListGroup>

      <GroupLabel>About</GroupLabel>
      <ListGroup>
        <ListRow
          icon="lock"
          label="Privacy"
          onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/privacy`)}
        />
        <ListRow
          icon="file-text"
          label="Terms"
          onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/terms`)}
        />
      </ListGroup>

      <ListGroup>
        <ListRow icon="log-out" label="Log out" showChevron={false} onPress={signOut} />
        <ListRow
          icon="trash-2"
          label="Delete account"
          danger
          showChevron={false}
          onPress={() => setConfirming(!confirming)}
        />
      </ListGroup>

      {confirming && (
        <View style={styles.danger}>
          <Body style={styles.muted}>
            This permanently removes your cars, records, photos, and posts.
          </Body>
          <Field
            label="Type DELETE to confirm"
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <FormError message={deleteError} />
          <Button label="Delete my account" kind="danger" busy={deleting} onPress={remove} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: space.lg },
  profileText: { flex: 1, gap: 2 },
  group: { gap: space.sm },
  muted: { color: colors.steel },
  danger: { gap: space.md },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  settingText: { flex: 1, gap: 2 },
  settingLabel: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 16 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
