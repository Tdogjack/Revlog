import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";

// Each tab keeps its own stack so its title collapses natively as you scroll.
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.asphalt },
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: colors.asphalt },
        headerLargeTitleStyle: { color: colors.chalk, fontFamily: fonts.bold },
        headerStyle: { backgroundColor: colors.asphalt },
        headerTitleStyle: { color: colors.chalk, fontFamily: fonts.medium },
        headerTintColor: colors.amber,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
