import { Ionicons } from "@expo/vector-icons";
import type { FeedPost } from "@revlog/api";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { tapFeedback } from "@/lib/haptics";
import { colors, fonts, radius, space } from "@/lib/theme";

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

export function PostCard({
  post,
  onChange,
}: {
  post: FeedPost;
  onChange: (post: FeedPost) => void;
}) {
  const [cover] = post.photos;
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={post.title}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={() => router.push(`/post/${post.id}`)}
      >
        {cover && (
          <Image
            source={{ uri: cover.url }}
            style={styles.photo}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        )}
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.meta}>
          {post.carName}, {post.tagLabel}
        </Text>
      </Pressable>
      <View style={styles.stats}>
        <LikeButton post={post} onChange={onChange} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open comments, ${post.commentCount}`}
          hitSlop={8}
          style={styles.stat}
          onPress={() =>
            router.push({ pathname: "/post/[id]", params: { id: post.id, comments: "1" } })
          }
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.steel} />
          <Text style={styles.statText}>{post.commentCount}</Text>
        </Pressable>
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
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    marginBottom: space.sm,
  },
  title: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 19, lineHeight: 25 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row", gap: space.xl },
  stat: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 32 },
  statText: { color: colors.steel, fontFamily: fonts.medium, fontSize: 14 },
  statOn: { color: colors.amber },
});
