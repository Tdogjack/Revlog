import { Feather } from "@expo/vector-icons";
import type { Me, PostComment, PostDetail, SharedPart } from "@revlog/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { CommentBox, useCommentBoxSpace } from "@/components/comment-box";
import { useContentMenu, type MenuTarget } from "@/components/content-menu";
import { PhotoPager } from "@/components/photo-pager";
import { LikeButton, PostPhotoFooter } from "@/components/post-card";
import { Body, Heading, LoadFailed, Loading, Screen } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const money = (amount: string, currency: string | null) => {
  try {
    return Number(amount).toLocaleString("en-US", {
      style: "currency",
      currency: currency || "USD",
    });
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
};

// One shared part: its name (a link when it has one), quantity, and price.
function PartRow({ part }: { part: SharedPart }) {
  const url = part.url;
  const name = (
    <Text style={[styles.partName, url && styles.partLink]} numberOfLines={2}>
      {part.name}
      {part.quantity > 1 && <Text style={styles.partMeta}> x{part.quantity}</Text>}
    </Text>
  );
  return (
    <View style={styles.partRow}>
      {url ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${part.name}, opens the store page`}
          hitSlop={6}
          style={({ pressed }) => [styles.partMain, pressed && styles.pressed]}
          onPress={() => Linking.openURL(url).catch(() => Alert.alert("Link not opened", url))}
        >
          {name}
          <Feather name="external-link" size={14} color={colors.steel} />
        </Pressable>
      ) : (
        <View style={styles.partMain}>{name}</View>
      )}
      {part.price != null && (
        <Text style={styles.partPrice}>{money(part.price, part.currency)}</Text>
      )}
    </View>
  );
}

// A build post lists the car's installed mods, each with its shared parts;
// a mod post lists that mod's parts. Older servers only send part names.
function SharedParts({ data }: { data: PostDetail }) {
  const shared = data.sharedParts ?? [];
  const buildList = data.buildList ?? [];
  if (buildList.length > 0) {
    return (
      <View style={styles.panel}>
        <Heading>Build list</Heading>
        {buildList.map((mod, i) => {
          const parts = shared.filter((p) => p.modId === mod.id);
          return (
            <View key={mod.id} style={[styles.mod, i > 0 && styles.modRule]}>
              <View style={styles.modHead}>
                <Text style={styles.modName}>{mod.name}</Text>
                <Text style={styles.partMeta}>{mod.categoryLabel}</Text>
              </View>
              {parts.map((part) => (
                <PartRow key={part.id} part={part} />
              ))}
            </View>
          );
        })}
      </View>
    );
  }
  if (shared.length > 0) {
    return (
      <View style={styles.panel}>
        <Heading>Parts</Heading>
        {shared.map((part) => (
          <PartRow key={part.id} part={part} />
        ))}
      </View>
    );
  }
  if (data.parts.length === 0) return null;
  return (
    <View style={styles.panel}>
      <Heading>Parts</Heading>
      {data.parts.map((part, i) => (
        <Body key={`${part}-${i}`}>{part}</Body>
      ))}
    </View>
  );
}

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
  const commentBoxSpace = useCommentBoxSpace();
  const scroller = useRef<ComponentRef<typeof KeyboardAwareScrollView>>(null);
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
  // A like is shown right away; everything else comes fresh from the server,
  // so edits show when coming back from the editor.
  const post =
    liked?.id === data.post.id
      ? { ...data.post, liked: liked.liked, likeCount: liked.likeCount }
      : data.post;
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
                  // A build is edited from its car, where it's kept in step.
                  edit: () =>
                    router.push(
                      post.tag === "build"
                        ? `/car/${post.vehicleId}/build`
                        : { pathname: "/post/edit/[id]", params: { id: post.id } },
                    ),
                })
              }
            />
          ),
        }}
      />
      <Screen scrollRef={scroller} avoidKeyboard={false} bottomSpace={commentBoxSpace}>
        {post.photos.length > 0 && (
          <View style={styles.photos}>
            <PhotoPager
              photos={post.photos}
              footer={(close) => (
                <PostPhotoFooter
                  post={post}
                  onChange={setLiked}
                  onOpen={close}
                  onComments={() => {
                    close();
                    scroller.current?.scrollToEnd();
                  }}
                />
              )}
            />
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
        <SharedParts data={data} />

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
          {data.comments.length === 0 && <Body style={styles.muted}>Be the first to comment.</Body>}
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
  panel: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  mod: { gap: space.xs, paddingVertical: space.sm },
  modRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.edge },
  modHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.md,
  },
  modName: {
    flexShrink: 1,
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  partRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    minHeight: 36,
  },
  partMain: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: space.xs },
  partName: {
    flexShrink: 1,
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  partLink: { textDecorationLine: "underline", textDecorationColor: colors.edge },
  partMeta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  partPrice: { color: colors.steel, fontFamily: fonts.mono, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.7 },
  comments: { gap: space.md, marginTop: space.md },
  comment: {
    gap: space.xs,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  commentHead: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 32 },
});
