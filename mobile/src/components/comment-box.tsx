import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tapFeedback } from "@/lib/haptics";
import { alpha, colors, fonts, MAX_WIDTH, space } from "@/lib/theme";

const PILL_HEIGHT = 52;
const GAP = space.sm;

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const shown = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (event) =>
      setHeight(event.endCoordinates.height),
    );
    const hidden = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () =>
      setHeight(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}

// How far above the screen's bottom edge the pill floats.
function usePillOffset() {
  const keyboard = useKeyboardHeight();
  const { bottom } = useSafeAreaInsets();
  return keyboard > 0 ? keyboard + GAP : Math.max(bottom, GAP);
}

// Room to leave under a page, so the pill never covers its last line.
export function useCommentBoxSpace() {
  return usePillOffset() + PILL_HEIGHT + space.lg;
}

// Real Liquid Glass where iOS has it, like the tab bar. Blur everywhere else.
function Glass({ children }: { children: ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" isInteractive style={styles.pill}>
        {children}
      </GlassView>
    );
  }
  return (
    <BlurView intensity={60} tint="dark" style={[styles.pill, styles.blurPill]}>
      {children}
    </BlurView>
  );
}

// Floats over a post however far the comments scroll, and rides up with the
// keyboard. The send button shows once there's something to send.
export function CommentBox({
  value,
  onChangeText,
  sending,
  error,
  onSend,
}: {
  value: string;
  onChangeText: (value: string) => void;
  sending: boolean;
  error: string | null;
  onSend: () => void;
}) {
  const offset = usePillOffset();
  return (
    <View style={[styles.float, { bottom: offset }]} pointerEvents="box-none">
      {error && (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      <Glass>
        <TextInput
          accessibilityLabel="Add a comment"
          placeholder="Add a comment"
          placeholderTextColor={colors.steel}
          selectionColor={colors.amber}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={1000}
        />
        {(sending || value.trim().length > 0) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            accessibilityState={{ busy: sending }}
            hitSlop={8}
            style={({ pressed }) => [styles.send, pressed && styles.sendPressed]}
            onPress={
              sending
                ? undefined
                : () => {
                    tapFeedback();
                    onSend();
                  }
            }
          >
            {sending ? (
              <ActivityIndicator color={colors.onAmber} />
            ) : (
              <Feather name="arrow-up" size={20} color={colors.onAmber} />
            )}
          </Pressable>
        )}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    alignSelf: "center",
    maxWidth: MAX_WIDTH,
    width: "100%",
    gap: space.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: PILL_HEIGHT,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingVertical: space.sm,
    borderRadius: PILL_HEIGHT / 2,
    overflow: "hidden",
  },
  blurPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha(colors.chalk, 0.25),
    backgroundColor: alpha(colors.panel, 0.72),
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingTop: 7,
    paddingBottom: 7,
    paddingHorizontal: 0,
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  send: {
    width: 36,
    height: 36,
    marginLeft: space.sm,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.amberFill,
  },
  sendPressed: { backgroundColor: colors.amberPressed },
  error: {
    alignSelf: "center",
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.overdueBg,
    color: colors.overdue,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});
