import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors, fonts } from "@/lib/theme";

type TabIconProps = { name: React.ComponentProps<typeof Feather>["name"]; color: unknown; size: number };

function TabIcon({ name, color, size }: TabIconProps) {
  return <Feather name={name} size={size} color={color as string} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.asphalt },
        headerTitleStyle: { color: colors.chalk, fontFamily: fonts.medium },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.asphalt, borderTopColor: colors.rule },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.steel,
        tabBarLabelStyle: { fontFamily: fonts.medium },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Your garage", tabBarLabel: "Garage", tabBarIcon: (props) => <TabIcon name="truck" {...props} /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: "Community", tabBarIcon: (props) => <TabIcon name="message-circle" {...props} /> }}
      />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: (props) => <TabIcon name="user" {...props} /> }} />
    </Tabs>
  );
}
