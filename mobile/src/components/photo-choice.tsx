import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { tapFeedback } from "@/lib/haptics";
import { colors, radius, space } from "@/lib/theme";

export const PHOTO_CHOICE_SIZE = 96;

// A photo that can be picked for a post, with a check when it's chosen.
export function PhotoChoice({
  url,
  chosen,
  label,
  onPress,
}: {
  url: string;
  chosen: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
    >
      <Image source={{ uri: url }} style={[styles.thumb, chosen && styles.chosen]} contentFit="cover" />
      {chosen && (
        <View style={styles.check}>
          <Feather name="check" size={14} color={colors.onAmber} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: PHOTO_CHOICE_SIZE,
    height: PHOTO_CHOICE_SIZE,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.panel,
  },
  chosen: { borderColor: colors.amber },
  check: {
    position: "absolute",
    top: space.xs,
    right: space.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.amberFill,
  },
});
