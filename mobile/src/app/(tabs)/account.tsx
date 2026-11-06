import type { Me } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Field } from "@/components/fields";
import {
  Body,
  Button,
  FormError,
  Heading,
  LoadFailed,
  Loading,
  Screen,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function Account() {
  const { data, error, reload } = useApi<Me>("/me");
  const { signOut, forget } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
      <View style={styles.group}>
        {data.username && <Heading>{data.username}</Heading>}
        <Body style={styles.muted}>{data.email}</Body>
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
      {data.moderator && <Button label="Open moderation" onPress={() => router.push("/moderation")} />}
      <Button label="Blocked accounts" kind="secondary" onPress={() => router.push("/blocked")} />
      <Button label="Log out" kind="secondary" onPress={signOut} />

      <View style={styles.danger}>
        <Heading>Delete account</Heading>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  muted: { color: colors.steel },
  danger: {
    gap: space.md,
    marginTop: space.xl,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.edge,
  },
});
