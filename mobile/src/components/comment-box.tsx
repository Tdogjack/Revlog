import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FormError } from "@/components/ui";
import { tapFeedback } from "@/lib/haptics";
import { colors, fonts, MAX_WIDTH, radius, space } from "@/lib/theme";

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

// Stays at the bottom of a post however far the comments scroll, and rides up
// with the keyboard.
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
  const keyboard = useKeyboardHeight();
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { marginBottom: keyboard, paddingBottom: keyboard > 0 ? space.sm : Math.max(bottom, space.sm) },
      ]}
    >
      <View style={styles.column}>
        <FormError message={error} />
        <View style={styles.row}>
          <TextInput
            accessibilityLabel="Add a comment"
            placeholder="Add a comment"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.amber}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={1000}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            accessibilityState={{ busy: sending }}
            hitSlop={6}
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
              <Feather name="arrow-up" size={22} color={colors.onAmber} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    backgroundColor: colors.panel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.edge,
  },
  column: { width: "100%", maxWidth: MAX_WIDTH, alignSelf: "center", gap: space.xs },
  row: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: space.md,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.fieldEdge,
    backgroundColor: colors.asphalt,
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.amber,
  },
  sendPressed: { backgroundColor: colors.amberPressed },
});
