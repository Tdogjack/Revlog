import { Stack } from "expo-router";
import { colors, fonts } from "@/lib/theme";

// Each tab keeps its own stack. A compact title keeps the content near the top.
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.asphalt },
        headerStyle: { backgroundColor: colors.asphalt },
        headerTitleStyle: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 18 },
        headerTintColor: colors.amber,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
