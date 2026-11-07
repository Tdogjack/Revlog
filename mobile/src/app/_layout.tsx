import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  useFonts,
} from "@expo-google-fonts/ibm-plex-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { status } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_500Medium,
  });
  // A failed font falls back to the system one rather than blocking the app.
  const ready = status !== "loading" && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  const signedIn = status === "signedIn";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.asphalt },
        headerTintColor: colors.amber,
        headerTitleStyle: { color: colors.chalk, fontFamily: fonts.medium },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.asphalt },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-car" options={{ title: "Add a car", presentation: "modal" }} />
        <Stack.Screen
          name="car/[id]/index"
          options={{
            title: "",
            headerTransparent: true,
            headerStyle: { backgroundColor: "transparent" },
            headerTintColor: colors.chalk,
          }}
        />
        <Stack.Screen
          name="car/[id]/mileage"
          options={{
            title: "Update mileage",
            presentation: "formSheet",
            sheetAllowedDetents: [0.6],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="car/[id]/service/new"
          options={{ title: "Log service", presentation: "modal" }}
        />
        <Stack.Screen name="car/[id]/service/[recordId]" options={{ title: "Edit service" }} />
        <Stack.Screen
          name="car/[id]/reminders/new"
          options={{ title: "Add reminder", presentation: "modal" }}
        />
        <Stack.Screen name="car/[id]/reminders/[reminderId]" options={{ title: "Edit reminder" }} />
        <Stack.Screen
          name="car/[id]/mods/new"
          options={{ title: "Add a mod", presentation: "modal" }}
        />
        <Stack.Screen name="car/[id]/mods/[modId]" options={{ title: "Edit mod" }} />
        <Stack.Screen
          name="car/[id]/history"
          options={{ title: "Import service history", presentation: "modal" }}
        />
        <Stack.Screen
          name="car/[id]/build"
          options={{ title: "Public build", presentation: "modal" }}
        />
        <Stack.Screen name="post/[id]" options={{ title: "" }} />
        <Stack.Screen name="post/new" options={{ title: "Share a post", presentation: "modal" }} />
        <Stack.Screen name="user/[username]" options={{ title: "" }} />
        <Stack.Screen name="report" options={{ title: "Report", presentation: "modal" }} />
        <Stack.Screen
          name="username"
          options={{ title: "Choose a username", presentation: "modal" }}
        />
        <Stack.Screen name="blocked" options={{ title: "Blocked accounts" }} />
        <Stack.Screen name="moderation" options={{ title: "Moderation" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: "Create account" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.asphalt }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Routes />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
