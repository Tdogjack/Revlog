import { Feather } from "@expo/vector-icons";
import type { CommunityProfile, FeedPost, Me } from "@revlog/api";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useContentMenu } from "@/components/content-menu";
import { PostCard } from "@/components/post-card";
import { Body, Button, EmptyState, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function Profile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data, error, reload } = useApi<CommunityProfile>(
    `/community/profile?username=${encodeURIComponent(username)}`,
  );
  const me = useApi<Me>("/me");
  const [edits, setEdits] = useState<Record<string, FeedPost>>({});
  const { open, menu } = useContentMenu({ moderator: !!me.data?.moderator, onGone: reload });

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  const act = async (work: () => Promise<unknown>) => {
    try {
      await work();
      await reload();
    } catch (err) {
      Alert.alert("That didn't work", errorMessage(err));
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `@${data.username}`,
          headerRight: data.isOwn
            ? undefined
            : () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Account options"
                  hitSlop={12}
                  onPress={() =>
                    open({
                      kind: "user",
                      id: data.userId,
                      userId: data.userId,
                      username: data.username,
                      mine: false,
                    })
                  }
                >
                  <Feather name="more-horizontal" size={22} color={colors.steel} />
                </Pressable>
              ),
        }}
      />
      <Screen>
        {data.blocked && (
          <Button
            label={`Unblock @${data.username}`}
            kind="secondary"
            onPress={() => act(() => api(`/community/blocks/${data.userId}`, { method: "DELETE" }))}
          />
        )}
        {data.suspended && (
          <>
            <Body style={{ color: colors.overdue }}>This account is suspended.</Body>
            <Button
              label="Restore account"
              kind="secondary"
              onPress={() =>
                act(() =>
                  api(`/moderation/users/${data.userId}`, {
                    method: "POST",
                    body: { action: "restore" },
                  }),
                )
              }
            />
          </>
        )}
        {data.posts.length === 0 ? (
          <EmptyState
            title={data.blocked ? "You blocked this account" : "No posts yet"}
            body={
              data.blocked
                ? "Their posts and comments stay hidden until you unblock them."
                : "Posts from this account will show here."
            }
          />
        ) : (
          <View>
            {data.posts.map((post) => (
              <PostCard
                key={post.id}
                post={edits[post.id] ?? post}
                onChange={(next) => setEdits((current) => ({ ...current, [next.id]: next }))}
              />
            ))}
          </View>
        )}
      </Screen>
      {menu}
    </>
  );
}
