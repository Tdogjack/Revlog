import { Image, type ImageContentFit } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// Quick and settled: no overshoot, no bounce.
const SETTLE = { duration: 160, easing: Easing.out(Easing.cubic) };
// How far, or how fast, a downward swipe has to go to close the viewer.
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 900;
// Movement before a drag counts as a swipe one way or the other.
const SLOP = 10;

const clamp = (value: number, limit: number) => {
  "worklet";
  return Math.min(Math.max(value, -limit), limit);
};

// A photo you can pinch to zoom. In a full-screen viewer it stays zoomed so you
// can drag around it, a double tap zooms in or back out, and a swipe down (when
// not zoomed) calls `onDismiss`. With `snapBack` (photos inline on a page) it
// eases back as soon as you let go.
export function ZoomableImage({
  uri,
  fallbackUri,
  cacheKey,
  width,
  height,
  contentFit = "contain",
  snapBack = false,
  label,
  dragY,
  zoomLock,
  onTap,
  onZoomChange,
  onDismiss,
}: {
  uri: string;
  // Shown instead if `uri` fails to load, like a small copy that doesn't exist yet.
  fallbackUri?: string;
  cacheKey?: string;
  width: number;
  height: number;
  contentFit?: ImageContentFit;
  snapBack?: boolean;
  label: string;
  // Shared with the viewer so it can fade out as the photo is pulled down.
  dragY?: SharedValue<number>;
  // Set the moment a second finger lands, so the pager stops scrolling on
  // the UI thread instead of sliding while JavaScript catches up.
  zoomLock?: SharedValue<boolean>;
  onTap?: () => void;
  onZoomChange?: (zoomed: boolean) => void;
  onDismiss?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const dismissing = useSharedValue(false);
  // Pointers in the last pinch update, to spot a finger lifting or returning.
  const pinchPointers = useSharedValue(0);
  // True from the second finger landing until every finger is up, so the
  // finger left behind after a pinch can't start a drag.
  const pinchedThisTouch = useSharedValue(false);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const panOffsetX = useSharedValue(0);
  const panOffsetY = useSharedValue(0);
  const ownDrag = useSharedValue(0);
  const drag = dragY ?? ownDrag;

  // How far a photo at this scale can move before its edge leaves the frame.
  const limitX = (s: number) => {
    "worklet";
    return (width * (s - 1)) / 2;
  };
  const limitY = (s: number) => {
    "worklet";
    return (height * (s - 1)) / 2;
  };

  const reportZoom = (zoomed: boolean) => {
    "worklet";
    if (onZoomChange) scheduleOnRN(onZoomChange, zoomed);
  };

  const lock = (on: boolean) => {
    "worklet";
    if (zoomLock) zoomLock.set(on);
  };

  const reset = () => {
    "worklet";
    lock(false);
    scale.set(withTiming(1, SETTLE));
    x.set(withTiming(0, SETTLE));
    y.set(withTiming(0, SETTLE));
    reportZoom(false);
  };

  const pinch = Gesture.Pinch()
    .onTouchesDown((event) => {
      if (event.numberOfTouches >= 2) {
        pinchedThisTouch.set(true);
        lock(true);
      }
    })
    .onStart((event) => {
      lock(true);
      startScale.set(scale.get());
      startX.set(x.get());
      startY.set(y.get());
      pinchPointers.set(event.numberOfPointers);
      reportZoom(true);
    })
    .onUpdate((event) => {
      const fx = event.focalX - width / 2;
      const fy = event.focalY - height / 2;
      const pointers = event.numberOfPointers;
      const before = pinchPointers.get();
      pinchPointers.set(pointers);
      // With one finger lifted the "focal point" is just the other finger, and
      // following it is what dragged the photo toward that finger. Hold still.
      if (pointers < 2) return;
      // A finger came back: carry on from where the photo is now, not from
      // where the pinch started.
      if (before < 2) {
        startScale.set(scale.get() / event.scale);
        startX.set(fx - (fx - x.get()) / event.scale);
        startY.set(fy - (fy - y.get()) / event.scale);
      }
      const next = Math.min(Math.max(startScale.get() * event.scale, 0.8), MAX_SCALE);
      // Keep the spot between your fingers under your fingers.
      const grow = next / startScale.get();
      scale.set(next);
      x.set(fx - (fx - startX.get()) * grow);
      y.set(fy - (fy - startY.get()) * grow);
    })
    .onEnd(() => {
      const s = scale.get();
      if (snapBack || s <= 1.01) {
        reset();
        return;
      }
      x.set(withTiming(clamp(x.get(), limitX(s)), SETTLE));
      y.set(withTiming(clamp(y.get(), limitY(s)), SETTLE));
    })
    .onFinalize(() => {
      // Two fingers down but no real pinch: let the pager scroll again.
      if (scale.get() <= 1.01) lock(false);
    });

  // One finger: moves a zoomed photo, or pulls an unzoomed one down to close.
  // A sideways drag on an unzoomed photo is left to the pager.
  const pan = Gesture.Pan()
    .enabled(!snapBack)
    .maxPointers(1)
    .manualActivation(true)
    .onTouchesDown((event) => {
      // First finger of a new touch: nothing has been pinched yet.
      if (event.numberOfTouches === 1) pinchedThisTouch.set(false);
      touchX.set(event.allTouches[0].absoluteX);
      touchY.set(event.allTouches[0].absoluteY);
    })
    .onTouchesMove((event, state) => {
      if (pinchedThisTouch.get() || event.numberOfTouches > 1) {
        state.fail();
        return;
      }
      if (scale.get() > 1.01) {
        dismissing.set(false);
        state.activate();
        return;
      }
      const dx = event.allTouches[0].absoluteX - touchX.get();
      const dy = event.allTouches[0].absoluteY - touchY.get();
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      if (onDismiss && dy > Math.abs(dx)) {
        dismissing.set(true);
        state.activate();
      } else {
        state.fail();
      }
    })
    .onStart((event) => {
      panStartX.set(x.get());
      panStartY.set(y.get());
      // Movement before the drag took over (the slop) shouldn't jump the photo.
      panOffsetX.set(event.translationX);
      panOffsetY.set(event.translationY);
    })
    .onUpdate((event) => {
      const dx = event.translationX - panOffsetX.get();
      const dy = event.translationY - panOffsetY.get();
      if (dismissing.get()) {
        drag.set(Math.max(dy, 0));
        return;
      }
      const s = scale.get();
      x.set(clamp(panStartX.get() + dx, limitX(s)));
      y.set(clamp(panStartY.get() + dy, limitY(s)));
    })
    .onEnd((event) => {
      if (!dismissing.get()) return;
      dismissing.set(false);
      const pulled = event.translationY - panOffsetY.get();
      if (onDismiss && (pulled > CLOSE_DISTANCE || event.velocityY > CLOSE_VELOCITY)) {
        drag.set(
          withTiming(height, { duration: 140, easing: Easing.in(Easing.quad) }, (done) => {
            if (done) scheduleOnRN(onDismiss);
          }),
        );
      } else {
        drag.set(withTiming(0, SETTLE));
      }
    });

  const doubleTap = Gesture.Tap()
    .enabled(!snapBack)
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.get() > 1.01) {
        reset();
        return;
      }
      const fx = event.x - width / 2;
      const fy = event.y - height / 2;
      const grow = DOUBLE_TAP_SCALE - 1;
      scale.set(withTiming(DOUBLE_TAP_SCALE, SETTLE));
      x.set(withTiming(clamp(-fx * grow, limitX(DOUBLE_TAP_SCALE)), SETTLE));
      y.set(withTiming(clamp(-fy * grow, limitY(DOUBLE_TAP_SCALE)), SETTLE));
      lock(true);
      reportZoom(true);
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (onTap) scheduleOnRN(onTap);
  });

  const gesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, tap));

  const motion = useAnimatedStyle(() => {
    const pulled = drag.get();
    return {
      transform: [
        { translateX: x.get() },
        { translateY: y.get() + pulled },
        // Shrinks a little as it is pulled down, so it reads as leaving.
        { scale: scale.get() * (1 - Math.min(pulled / height, 1) * 0.15) },
      ],
    };
  });

  return (
    // The gesture sits on a frame that never moves, so finger positions are
    // measured against the screen and not the already-zoomed photo, which is
    // what made zooming shake.
    <GestureDetector gesture={gesture}>
      <View
        style={{ width, height }}
        collapsable={false}
        accessible
        accessibilityRole={onTap ? "button" : "image"}
        accessibilityLabel={label}
      >
        <Animated.View style={[StyleSheet.absoluteFill, motion]}>
          <Image
            source={{
              uri: failed && fallbackUri ? fallbackUri : uri,
              cacheKey: failed ? undefined : cacheKey,
            }}
            onError={() => setFailed(true)}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            transition={150}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
