import { Stack } from "expo-router";
import { Platform } from "react-native";
import { colors, fonts, lightTheme } from "@/lib/theme";

// The translucent bar iOS uses for navigation: content scrolls up under it and
// shows through, blurred. Android keeps a solid bar.
export const translucentHeader =
  Platform.OS === "ios"
    ? ({
        headerTransparent: true,
        headerBlurEffect: lightTheme ? "systemChromeMaterialLight" : "systemChromeMaterialDark",
        headerStyle: { backgroundColor: "transparent" },
      } as const)
    : ({ headerStyle: { backgroundColor: colors.asphalt } } as const);

// Each tab keeps its own stack. The root of each tab gets a large title that
// shrinks into the bar as the page scrolls, so you always know which tab
// you're in.
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.asphalt },
        ...translucentHeader,
        headerTitleStyle: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 17 },
        headerTintColor: colors.amber,
        headerShadowVisible: false,
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerLargeTitleStyle: {
          color: colors.chalk,
          fontFamily: fonts.bold,
          fontSize: 34,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
