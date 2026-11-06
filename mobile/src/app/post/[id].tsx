import { Feather } from "@expo/vector-icons";
import type { Me, PostComment, PostDetail } from "@revlog/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CommentBox } from "@/components/comment-box";
import { useContentMenu, type MenuTarget } from "@/components/content-menu";
import { PhotoPager } from "@/components/photo-pager";
import { LikeButton } from "@/components/post-card";
import {
  Body,
  Heading,
  LoadFailed,
  Loading,
  Screen,
} from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { colors, fonts, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={12} onPress={onPress}>
      <Feather name="more-horizontal" size={22} color={colors.steel} />
    </Pressable>
  );
}

function CommentRow({
  comment,
  onMenu,
}: {
  comment: PostComment;
  onMenu: (comment: PostComment) => void;
}) {
  return (
    <View style={styles.comment}>
      <View style={styles.commentHead}>
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push(`/user/${comment.username}`)}
        >
          <Text style={styles.author}>@{comment.username}</Text>
        </Pressable>
        <Text style={styles.meta}>{formatDay(comment.createdAt)}</Text>
        <View style={styles.push}>
          <MenuButton
            label={`Options for comment by ${comment.username}`}
            onPress={() => onMenu(comment)}
          />
        </View>
      </View>
      <Body>{comment.body}</Body>
    </View>
  );
}

export default function Post() {
  const { id, comments } = useLocalSearchParams<{ id: string; comments?: string }>();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const jumped = useRef(false);
  const { data, error, reload } = useApi<PostDetail>(`/community/posts/${id}`);
  const me = useApi<Me>("/me");
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState<PostDetail["post"] | null>(null);

  const { open, menu } = useContentMenu({
    moderator: !!me.data?.moderator,
    onGone: (target: MenuTarget) => {
      if (target.kind === "comment") reload();
      else router.back();
    },
  });

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;
  const post = liked?.id === data.post.id ? liked : data.post;
  const myId = me.data?.id;

  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      await api(`/community/posts/${id}/comments`, { method: "POST", body: { body: draft } });
      setDraft("");
      await reload();
      // Show the new comment, which lands at the end of the thread.
      scroller.current?.scrollToEnd();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) router.push("/username");
      else setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: post.tagLabel,
          headerRight: () => (
            <MenuButton
              label="Post options"
              onPress={() =>
                open({
                  kind: "post",
                  id: post.id,
                  userId: post.userId,
                  username: post.username,
                  mine: post.userId === myId,
                })
              }
            />
          ),
        }}
      />
      <Screen scrollRef={scroller} avoidKeyboard={false}>
        {post.photos.length > 0 && (
          <View style={styles.photos}>
            <PhotoPager photos={post.photos} />
          </View>
        )}
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {post.title}
          </Text>
          <Text style={styles.meta}>
            {post.modName ? `${post.modName}, ${post.carName}` : post.carName}
          </Text>
          <View style={styles.byline}>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push(`/user/${post.username}`)}
            >
              <Text style={styles.author}>@{post.username}</Text>
            </Pressable>
            <Text style={styles.meta}>{formatDay(post.createdAt)}</Text>
            <View style={styles.push}>
              <LikeButton post={post} onChange={setLiked} />
            </View>
          </View>
        </View>
        {post.body && <Body>{post.body}</Body>}
        {data.parts.length > 0 && (
          <View style={styles.parts}>
            <Heading>Parts</Heading>
            {data.parts.map((part, i) => (
              <Body key={`${part}-${i}`}>{part}</Body>
            ))}
          </View>
        )}

        <View
          style={styles.comments}
          onLayout={(event) => {
            // Opened from a comment button: land on the thread, once.
            if (comments && !jumped.current) {
              jumped.current = true;
              scroller.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: false });
            }
          }}
        >
          <Heading>Comments</Heading>
          {data.comments.length === 0 && (
            <Body style={styles.muted}>Be the first to comment.</Body>
          )}
          {data.comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              onMenu={(c) =>
                open({
                  kind: "comment",
                  id: c.id,
                  userId: c.userId,
                  username: c.username,
                  // The post's owner can remove comments on it too.
                  mine: c.userId === myId || post.userId === myId,
                })
              }
            />
          ))}
        </View>
      </Screen>
      <CommentBox
        value={draft}
        onChangeText={setDraft}
        sending={sending}
        error={sendError}
        onSend={send}
      />
      {menu}
    </>
  );
}

const styles = StyleSheet.create({
  // Runs edge to edge, past the column padding.
  photos: { marginTop: -space.lg, marginHorizontal: -space.lg },
  head: { gap: space.xs },
  title: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.steel },
  byline: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 36 },
  author: { color: colors.amber, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  push: { marginLeft: "auto" },
  parts: { gap: space.xs },
  comments: { gap: space.md, marginTop: space.md },
  comment: {
    gap: space.xs,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  commentHead: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 32 },
});
