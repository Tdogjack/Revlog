import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts, tracking } from "@/lib/theme";

// The gauge and two-tone wordmark from the website header.
export function Wordmark() {
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Revlog">
      <Svg
        width={30}
        height={30}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.amber}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="m12 14 4-4" />
        <Path d="M3.34 19a10 10 0 1 1 17.32 0" />
      </Svg>
      <Text style={styles.word}>
        Rev<Text style={styles.accent}>log</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  word: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 28, letterSpacing: tracking(28) },
  accent: { color: colors.amber },
});
