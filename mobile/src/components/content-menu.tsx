import type { ReportKind } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, fonts, MAX_WIDTH, space } from "@/lib/theme";

export type MenuTarget = {
  kind: ReportKind;
  id: string;
  userId: string;
  username: string;
  mine: boolean;
};

type Action = { label: string; danger?: boolean; run: () => void };

// Android alerts stop at three buttons, and a moderator has five choices.
function ActionSheet({
  title,
  actions,
  onClose,
}: {
  title: string;
  actions: Action[];
  onClose: () => void;
}) {
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={styles.sheet}>
        <View style={styles.sheetColumn}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              kind={action.danger ? "danger" : "secondary"}
              onPress={() => {
                onClose();
                action.run();
              }}
            />
          ))}
          <Button label="Cancel" kind="secondary" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function confirm(title: string, message: string, label: string, run: () => Promise<unknown>) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: label,
      style: "destructive",
      onPress: () => {
        run().catch((err) => Alert.alert("That didn't work", errorMessage(err)));
      },
    },
  ]);
}

const noun = { post: "post", comment: "comment", user: "account" };

// Report, block, delete, and moderator actions for a post, comment, or profile.
// `onGone` runs after something leaves this person's view.
export function useContentMenu({
  moderator,
  onGone,
}: {
  moderator: boolean;
  onGone: (target: MenuTarget) => void;
}) {
  const [target, setTarget] = useState<MenuTarget | null>(null);

  const actionsFor = (t: MenuTarget): Action[] => {
    const name = noun[t.kind];
    const actions: Action[] = [];

    if (t.mine && t.kind !== "user") {
      actions.push({
        label: `Delete ${name}`,
        danger: true,
        run: () =>
          confirm(`Delete this ${name}?`, "This can't be undone.", `Delete ${name}`, async () => {
            const path = t.kind === "post" ? "posts" : "comments";
            await api(`/community/${path}/${t.id}`, { method: "DELETE" });
            onGone(t);
          }),
      });
    }

    if (!t.mine) {
      actions.push({
        label: `Report ${name}`,
        run: () =>
          router.push({
            pathname: "/report",
            params: { kind: t.kind, targetId: t.id, userId: t.userId, username: t.username },
          }),
      });
      actions.push({
        label: `Block @${t.username}`,
        danger: true,
        run: () =>
          confirm(
            `Block @${t.username}?`,
            "You won't see their posts or comments, and they can't comment on or like yours. Revlog's moderators are told.",
            "Block account",
            async () => {
              await api("/community/blocks", { method: "POST", body: { userId: t.userId } });
              onGone(t);
            },
          ),
      });
    }

    if (moderator) {
      if (t.kind !== "user") {
        actions.push({
          label: `Remove ${name} as moderator`,
          danger: true,
          run: () =>
            confirm(`Remove this ${name}?`, "It's deleted for everyone.", `Remove ${name}`, async () => {
              await api(`/moderation/content/${t.id}`, {
                method: "DELETE",
                body: { kind: t.kind },
              });
              onGone(t);
            }),
        });
      }
      if (!t.mine) {
        actions.push({
          label: `Suspend @${t.username}`,
          danger: true,
          run: () =>
            confirm(
              `Suspend @${t.username}?`,
              "Their posts and comments are hidden, and they can't post. Their garage isn't touched.",
              "Suspend account",
              () => api(`/moderation/users/${t.userId}`, { method: "POST", body: { action: "suspend" } }),
            ),
        });
      }
    }
    return actions;
  };

  return {
    open: setTarget,
    menu: target && (
      <ActionSheet
        title={`@${target.username}`}
        actions={actionsFor(target)}
        onClose={() => setTarget(null)}
      />
    ),
  };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sheetColumn: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    padding: space.lg,
    gap: space.sm,
  },
  title: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
});
