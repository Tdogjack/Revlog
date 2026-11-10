import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { alpha, colors, radius, space } from "@/lib/theme";

// Swipeable post photos, with a dot for each one so people know to swipe.
export function PhotoPager({
  photos,
  rounded = false,
  onPress,
}: {
  photos: { id: string; url: string }[];
  rounded?: boolean;
  onPress?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  return (
    <View
      style={[styles.frame, rounded && styles.rounded]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((photo, i) => (
            <Pressable
              key={photo.id}
              disabled={!onPress}
              accessibilityRole={onPress ? "button" : "image"}
              accessibilityLabel={`Post photo ${i + 1} of ${photos.length}`}
              onPress={onPress}
            >
              <Image
                source={{ uri: photo.url }}
                style={{ width, height: "100%" }}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none" accessibilityElementsHidden>
          {photos.map((photo, i) => (
            <View key={photo.id} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.panel },
  rounded: { borderRadius: radius.lg, overflow: "hidden" },
  dots: {
    position: "absolute",
    bottom: space.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: alpha(colors.asphalt, 0.6),
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.steel },
  dotActive: { backgroundColor: colors.amber },
});
