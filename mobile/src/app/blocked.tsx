import type { BlockedUser } from "@revlog/api";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function Blocked() {
  const { data, error, reload } = useApi<BlockedUser[]>("/community/blocks");

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const unblock = async (user: BlockedUser) => {
    try {
      await api(`/community/blocks/${user.userId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      Alert.alert("Account not unblocked", errorMessage(err));
    }
  };

  return (
    <Screen>
      {data.length === 0 ? (
        <EmptyState
          title="No blocked accounts"
          body="Anyone you block from a post, comment, or profile shows here."
        />
      ) : (
        data.map((user) => (
          <View key={user.userId} style={styles.row}>
            <Text style={styles.name}>@{user.username}</Text>
            <Button label="Unblock" kind="secondary" onPress={() => unblock(user)} />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingVertical: space.sm,
  },
  name: { flex: 1, color: colors.chalk, fontFamily: fonts.medium, fontSize: 16 },
});
