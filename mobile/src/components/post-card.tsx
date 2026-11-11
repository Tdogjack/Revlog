import { Ionicons } from "@expo/vector-icons";
import type { FeedPost } from "@revlog/api";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { PhotoPager } from "@/components/photo-pager";
import { Avatar } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { tapFeedback } from "@/lib/haptics";
import { colors, fonts, photoInk, photoInkMuted, space } from "@/lib/theme";

export function LikeButton({
  post,
  onChange,
}: {
  post: FeedPost;
  onChange: (post: FeedPost) => void;
}) {
  const toggle = async () => {
    const liked = !post.liked;
    tapFeedback();
    // Shown right away, and put back if the server says no.
    onChange({ ...post, liked, likeCount: post.likeCount + (liked ? 1 : -1) });
    try {
      const result = await api<{ liked: boolean; likeCount: number }>(
        `/community/posts/${post.id}/like`,
        { method: "POST", body: { liked } },
      );
      onChange({ ...post, ...result });
    } catch (err) {
      onChange(post);
      Alert.alert("Like not saved", errorMessage(err));
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: post.liked }}
      accessibilityLabel={`${post.liked ? "Unlike" : "Like"} post, ${post.likeCount} likes`}
      hitSlop={8}
      style={styles.stat}
      onPress={toggle}
    >
      <Ionicons
        name={post.liked ? "heart" : "heart-outline"}
        size={20}
        color={post.liked ? colors.amber : colors.steel}
      />
      <Text style={[styles.statText, post.liked && styles.statOn]}>{post.likeCount}</Text>
    </Pressable>
  );
}

// The post's title, author, likes, and comments over full-screen photos.
export function PostPhotoFooter({
  post,
  onChange,
  onOpen,
  onComments,
}: {
  post: FeedPost;
  onChange: (post: FeedPost) => void;
  onOpen: () => void;
  onComments: () => void;
}) {
  return (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${post.title}, by ${post.username}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={onOpen}
      >
        <Text style={[styles.title, styles.onPhoto]} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={[styles.meta, styles.onPhotoMuted]} numberOfLines={1}>
          @{post.username}, {post.carName}
        </Text>
      </Pressable>
      <View style={styles.stats}>
        <LikeButton post={post} onChange={onChange} />
        <CommentButton count={post.commentCount} onPress={onComments} />
      </View>
    </View>
  );
}

function CommentButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open comments, ${count}`}
      hitSlop={8}
      style={styles.stat}
      onPress={onPress}
    >
      <Ionicons name="chatbubble-outline" size={19} color={colors.steel} />
      <Text style={styles.statText}>{count}</Text>
    </Pressable>
  );
}

export function PostCard({
  post,
  onChange,
}: {
  post: FeedPost;
  onChange: (post: FeedPost) => void;
}) {
  const open = () => router.push(`/post/${post.id}`);
  const openComments = () =>
    router.push({ pathname: "/post/[id]", params: { id: post.id, comments: "1" } });
  return (
    <View style={styles.card}>
      <View style={styles.byline}>
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          style={styles.author}
          onPress={() => router.push(`/user/${post.username}`)}
        >
          <Avatar name={post.username} />
          <Text style={styles.username}>@{post.username}</Text>
        </Pressable>
        <Text style={styles.meta}>{formatDay(post.createdAt)}</Text>
      </View>
      {post.photos.length > 0 && (
        <PhotoPager
          photos={post.photos}
          rounded
          footer={(close) => (
            <PostPhotoFooter
              post={post}
              onChange={onChange}
              onOpen={() => {
                close();
                open();
              }}
              onComments={() => {
                close();
                openComments();
              }}
            />
          )}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={post.title}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={open}
      >
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.meta}>
          {post.carName}, {post.tagLabel}
        </Text>
      </Pressable>
      <View style={styles.stats}>
        <LikeButton post={post} onChange={onChange} />
        <CommentButton count={post.commentCount} onPress={openComments} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  byline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  author: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
  username: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  main: { gap: space.xs },
  pressed: { opacity: 0.7 },
  title: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row", gap: space.xl },
  stat: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 32 },
  statText: { color: colors.steel, fontFamily: fonts.medium, fontSize: 14 },
  statOn: { color: colors.amber },
  footer: { gap: space.md },
  onPhoto: { color: photoInk },
  onPhotoMuted: { color: photoInkMuted },
});
