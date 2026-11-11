import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue } from "react-native-reanimated";
import { PhotoViewer } from "@/components/photo-viewer";
import { ZoomableImage } from "@/components/zoomable-image";
import { alpha, colors, radius, space } from "@/lib/theme";

// Swipeable post photos, with a dot for each one so people know to swipe.
// Pinch to zoom in place; tap to open them full screen with `footer` (the
// post's title and likes) over the bottom.
export function PhotoPager({
  photos,
  rounded = false,
  full = false,
  footer,
}: {
  photos: { id: string; url: string; thumbUrl?: string }[];
  rounded?: boolean;
  // Full photos inline, for an opened post; feed cards load the small copies.
  full?: boolean;
  footer?: (close: () => void) => ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const zoomLock = useSharedValue(false);
  // A pinch stops the pages at once, on the UI thread.
  const scrollProps = useAnimatedProps(() => ({ scrollEnabled: !zoomLock.get() }));

  return (
    <View
      style={[styles.frame, rounded && styles.rounded]}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        setHeight(event.nativeEvent.layout.height);
      }}
    >
      {width > 0 && (
        <Animated.ScrollView
          animatedProps={scrollProps}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((photo, i) => (
            <ZoomableImage
              key={photo.id}
              // The small copy inline; the full-screen viewer loads the full photo.
              uri={full ? photo.url : (photo.thumbUrl ?? photo.url)}
              fallbackUri={photo.url}
              cacheKey={!full && photo.thumbUrl ? `${photo.id}-thumb` : photo.id}
              width={width}
              height={height}
              contentFit="cover"
              snapBack
              label={`Post photo ${i + 1} of ${photos.length}, opens full screen`}
              onTap={() => setViewing(i)}
              zoomLock={zoomLock}
            />
          ))}
        </Animated.ScrollView>
      )}
      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none" accessibilityElementsHidden>
          {photos.map((photo, i) => (
            <View key={photo.id} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}
      <PhotoViewer
        photos={photos}
        index={viewing}
        onClose={() => setViewing(null)}
        footer={footer}
      />
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
