import { router } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { useEffect } from "react";
import { onPushTap, registerForPush } from "@/lib/push";
import { takeUsernamePrompt } from "@/lib/username-prompt";
import { colors, fonts } from "@/lib/theme";

export default function TabsLayout() {
  // Signed in from here on: keep this phone's push token current (without
  // asking) and open the screen a tapped reminder points at.
  useEffect(() => {
    registerForPush({ ask: false }).catch(() => undefined);
    if (takeUsernamePrompt()) router.push("/username");
    return onPushTap((url) => router.push(url as never));
  }, []);

  return (
    <NativeTabs
      tintColor={colors.amber}
      iconColor={colors.steel}
      backgroundColor={colors.asphalt}
      indicatorColor={colors.graphite}
      labelStyle={{ fontFamily: fonts.medium }}
    >
      <NativeTabs.Trigger name="(garage)">
        <NativeTabs.Trigger.Icon sf={{ default: "car", selected: "car.fill" }} md="directions_car" />
        <NativeTabs.Trigger.Label>Garage</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <NativeTabs.Trigger.Icon
          sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }}
          md="forum"
        />
        <NativeTabs.Trigger.Label>Community</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
