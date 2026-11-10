import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Screen } from "@/components/ui";
import { tapFeedback } from "@/lib/haptics";
import { applyPalette } from "@/lib/palette-store";
import { colors, fonts, paletteId, palettes, radius, space } from "@/lib/theme";

export default function Appearance() {
  const [applying, setApplying] = useState<string | null>(null);

  const choose = async (id: string) => {
    if (id === paletteId || applying) return;
    tapFeedback();
    setApplying(id);
    try {
      await applyPalette(id);
    } catch {
      setApplying(null);
      Alert.alert("Colors not changed", "Close Revlog and open it again to see the new colors.");
    }
  };

  return (
    <Screen>
      <Body style={styles.muted}>
        Pick the colors Revlog uses on this phone. The app starts again to switch.
      </Body>
      <View style={styles.list} accessibilityRole="radiogroup">
        {palettes.map((palette) => {
          const selected = palette.id === paletteId;
          return (
            <Pressable
              key={palette.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, busy: applying === palette.id }}
              accessibilityLabel={`${palette.name}, ${palette.description}`}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
              onPress={() => choose(palette.id)}
            >
              <View style={styles.swatches}>
                {[palette.colors.asphalt, palette.colors.graphite, palette.colors.amberFill].map(
                  (color, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
                  ),
                )}
              </View>
              <View style={styles.text}>
                <Text style={styles.name}>{palette.name}</Text>
                <Text style={styles.description}>{palette.description}</Text>
              </View>
              {applying === palette.id ? (
                <ActivityIndicator color={colors.amber} />
              ) : (
                selected && <Feather name="check" size={22} color={colors.amber} />
              )}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.steel },
  list: { gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 72,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.panel,
  },
  rowSelected: { borderColor: colors.amber },
  rowPressed: { backgroundColor: colors.graphite },
  swatches: {
    flexDirection: "row",
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.edge,
  },
  swatch: { width: 20, height: 40 },
  text: { flex: 1, gap: 2 },
  name: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  description: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
