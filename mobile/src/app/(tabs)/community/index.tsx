import { Feather } from "@expo/vector-icons";
import type { CommunityOptions, Feed, FeedPost } from "@revlog/api";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PostCard } from "@/components/post-card";
import { Button, EmptyState, FormToolbar, LoadFailed, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, fonts, MAX_WIDTH, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      accessibilityLabel={label}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipOn]}
            onPress={() => onChange(selected && label === "Filter by tag" ? "" : option.value)}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function Community() {
  const options = useApi<CommunityOptions>("/community/options");
  const [sort, setSort] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const page = useRef(1);
  const latest = useRef(0);

  const activeSort = sort ?? options.data?.defaultSort ?? "";

  const load = useCallback(
    async (nextPage: number) => {
      // Only the newest request counts, so slow answers can't overwrite it.
      const request = ++latest.current;
      const params = new URLSearchParams({
        sort: activeSort,
        page: String(nextPage),
      });
      if (tag) params.set("tag", tag);
      if (query) params.set("q", query);
      try {
        const feed = await api<Feed>(`/community/posts?${params}`);
        if (request !== latest.current) return;
        page.current = nextPage;
        setPosts((current) => (nextPage === 1 ? feed.posts : [...(current ?? []), ...feed.posts]));
        setHasMore(feed.hasMore);
        setError(null);
      } catch (err) {
        if (request === latest.current) setError(errorMessage(err));
      }
    },
    [activeSort, tag, query],
  );

  useFocusEffect(
    useCallback(() => {
      if (activeSort) load(1);
    }, [activeSort, load]),
  );

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  if (!options.data || !posts) {
    const message = options.error ?? error;
    return message ? (
      <LoadFailed
        message={message}
        onRetry={() => {
          options.reload();
          if (activeSort) load(1);
        }}
      />
    ) : (
      <Loading />
    );
  }

  const filtered = !!(tag || query);
  const clear = () => {
    setTag("");
    setSearch("");
    setQuery("");
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share a post"
              hitSlop={8}
              style={styles.headerButton}
              onPress={() => router.push("/post/new")}
            >
              <Feather name="plus" size={24} color={colors.amber} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={posts}
        keyExtractor={(post) => post.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <View style={styles.row}>
            <PostCard
              post={item}
              onChange={(next) =>
                setPosts((current) => current?.map((p) => (p.id === next.id ? next : p)) ?? null)
              }
            />
          </View>
        )}
        ListHeaderComponent={
          <View style={[styles.row, styles.header]}>
            <View style={styles.search}>
              <Feather name="search" size={18} color={colors.steel} />
              <TextInput
                accessibilityLabel="Search posts"
                style={styles.searchInput}
                placeholder="Search posts"
                placeholderTextColor={colors.placeholder}
                selectionColor={colors.amber}
                returnKeyType="search"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <Chips
              label="Sort posts"
              options={options.data.sorts}
              value={activeSort}
              onChange={setSort}
            />
            <Chips
              label="Filter by tag"
              options={options.data.tags}
              value={tag}
              onChange={setTag}
            />
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.row}>
            {filtered ? (
              <EmptyState
                title="No posts match"
                body="Try different words or a broader tag."
                action={<Button label="Clear all filters" kind="secondary" onPress={clear} />}
              />
            ) : (
              <EmptyState
                title="No posts yet"
                body="Share what you're working on and start the conversation."
                action={<Button label="Share a post" onPress={() => router.push("/post/new")} />}
              />
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            tintColor={colors.amber}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(1);
              setRefreshing(false);
            }}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasMore) load(page.current + 1);
        }}
      />
      <FormToolbar />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1, backgroundColor: colors.asphalt },
  // Centered here, because list rows shrink to their content in a centered parent.
  content: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    paddingBottom: space.xxl,
  },
  row: { paddingHorizontal: space.lg },
  header: { gap: space.md, paddingTop: space.md, paddingBottom: space.sm },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.fieldEdge,
    borderRadius: 8,
    paddingHorizontal: space.md,
  },
  searchInput: {
    flex: 1,
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  chips: { gap: space.sm },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: 18,
    paddingHorizontal: space.md,
  },
  chipOn: { borderColor: colors.amber },
  chipLabel: { color: colors.steel, fontFamily: fonts.medium, fontSize: 14 },
  chipLabelOn: { color: colors.amber },
  error: { color: colors.overdue, fontFamily: fonts.regular, fontSize: 14 },
});
