import { Feather } from "@expo/vector-icons";
import type { FeedPost } from "@revlog/api";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api, errorMessage } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { colors, fonts, space } from "@/lib/theme";

export function LikeButton({
  post,
  onChange,
}: {
  post: FeedPost;
  onChange: (post: FeedPost) => void;
}) {
  const toggle = async () => {
    const liked = !post.liked;
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
      <Feather name="heart" size={18} color={post.liked ? colors.amber : colors.steel} />
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
            accessibilityIgnoresInvertColors
          />
        )}
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.meta}>
          {post.carName}, {post.tagLabel}
        </Text>
      </Pressable>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push(`/user/${post.username}`)}
        >
          <Text style={styles.author}>@{post.username}</Text>
        </Pressable>
        <Text style={styles.meta}>{formatDay(post.createdAt)}</Text>
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
            <Feather name="message-circle" size={18} color={colors.steel} />
            <Text style={styles.statText}>{post.commentCount}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  main: { gap: space.xs },
  pressed: { opacity: 0.7 },
  photo: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: colors.panel,
    marginBottom: space.xs,
  },
  title: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  meta: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 32 },
  author: { color: colors.amber, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row", gap: space.lg, marginLeft: "auto" },
  stat: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 32 },
  statText: { color: colors.steel, fontFamily: fonts.medium, fontSize: 14 },
  statOn: { color: colors.amber },
});
