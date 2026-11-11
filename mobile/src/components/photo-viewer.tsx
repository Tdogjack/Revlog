import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ZoomableImage } from "@/components/zoomable-image";
import { tapFeedback } from "@/lib/haptics";
import { fonts, headerScrim, photoInk, scrim, space } from "@/lib/theme";

export type ViewerPhoto = { id: string; url: string };

type Extras = {
  // Shown over the bottom of the photo, like a post's title and likes.
  footer?: (close: () => void) => ReactNode;
  // Buttons for the photo on screen, like Delete.
  actions?: (photo: ViewerPhoto, close: () => void) => ReactNode;
};

// Full-screen photos: swipe between them, pinch or double tap to zoom, swipe
// down to close, and tap to hide or show the buttons. The buttons also step
// aside while zoomed. Opens at `index`; null keeps it closed.
export function PhotoViewer({
  photos,
  index,
  onClose,
  ...extras
}: {
  photos: ViewerPhoto[];
  index: number | null;
  onClose: () => void;
} & Extras) {
  return (
    <Modal
      visible={index !== null && photos.length > 0}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      {/* Gestures inside a modal need their own root on Android. */}
      <GestureHandlerRootView style={styles.root}>
        {index !== null && photos.length > 0 && (
          <Pages
            photos={photos}
            start={Math.min(index, photos.length - 1)}
            onClose={onClose}
            {...extras}
          />
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

function Pages({
  photos,
  start,
  onClose,
  footer,
  actions,
}: { photos: ViewerPhoto[]; start: number; onClose: () => void } & Extras) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [chrome, setChrome] = useState(true);
  const dragY = useSharedValue(0);
  const zoomLock = useSharedValue(false);
  // Two fingers on a photo stop the pages at once, on the UI thread.
  const listProps = useAnimatedProps(() => ({ scrollEnabled: !zoomLock.get() }));
  const showChrome = chrome && !zoomed;

  // The black fades and the buttons go first as the photo is pulled down.
  const backdrop = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.get(), [0, height * 0.6], [1, 0], "clamp"),
  }));
  const chromeFade = useAnimatedStyle(() => ({
    opacity: interpolate(dragY.get(), [0, 80], [1, 0], "clamp"),
  }));
  const photo = photos[Math.min(page, photos.length - 1)];
  const extra = actions?.(photo, onClose);
  const bottom = footer?.(onClose);

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]} />
      <Animated.FlatList
        animatedProps={listProps}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_data, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) =>
          setPage(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: i }) => (
          <ZoomableImage
            uri={item.url}
            cacheKey={item.id}
            width={width}
            height={height}
            label={`Photo ${i + 1} of ${photos.length}`}
            dragY={dragY}
            zoomLock={zoomLock}
            onTap={() => setChrome((shown) => !shown)}
            onZoomChange={setZoomed}
            onDismiss={onClose}
          />
        )}
      />

      {showChrome && (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          style={[styles.top, chromeFade]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={headerScrim}
            style={[styles.topBar, { paddingTop: insets.top + space.sm }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close photos"
              hitSlop={8}
              style={styles.close}
              onPress={() => {
                tapFeedback();
                onClose();
              }}
            >
              <Feather name="x" size={26} color={photoInk} />
            </Pressable>
            {photos.length > 1 && (
              <Text style={styles.count} accessibilityLiveRegion="polite">
                {page + 1} of {photos.length}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      )}

      {showChrome && (bottom || extra) && (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(120)}
          style={[styles.bottom, chromeFade]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={scrim}
            style={[styles.bottomBar, { paddingBottom: insets.bottom + space.lg }]}
          >
            {bottom}
            {extra && <View style={styles.actions}>{extra}</View>}
          </LinearGradient>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: "#000" },
  top: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.sm,
    paddingBottom: space.xl,
  },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  count: {
    paddingHorizontal: space.md,
    color: photoInk,
    fontFamily: fonts.medium,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0 },
  bottomBar: { gap: space.md, paddingHorizontal: space.lg, paddingTop: space.xxl * 2 },
  actions: { flexDirection: "row", gap: space.md },
});
