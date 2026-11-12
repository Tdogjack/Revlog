import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "@/lib/api";

const TOKEN_KEY = "revlog.pushToken";

// Show reminders as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushStatus = "on" | "denied" | "unavailable";

// Sends this phone's push token to the server. With ask set, shows the
// system prompt if the user hasn't answered it yet; without it, only
// refreshes a token for a phone that already allowed notifications.
export async function registerForPush({ ask }: { ask: boolean }): Promise<PushStatus> {
  // Simulators can't receive push.
  if (!Device.isDevice) return "unavailable";
  let { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask && canAskAgain) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") return "denied";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Reminders",
      importance: AndroidImportance.DEFAULT,
    });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("/me/push-token", { method: "PUT", body: { token, platform: Platform.OS } });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return "on";
}

// Called before logging out so the next person on this phone doesn't get
// the last one's reminders.
export async function unregisterPush() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  await api("/me/push-token", { method: "DELETE", body: { token } }).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function pushPermission(): Promise<PushStatus> {
  if (!Device.isDevice) return "unavailable";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "on" : "denied";
}

// Opens the screen a tapped reminder points at.
export function onPushTap(open: (url: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === "string") open(url);
  };
  // A tap that launched the app from closed.
  handle(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
