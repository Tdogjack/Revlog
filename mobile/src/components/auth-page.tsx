import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/brand";
import { Screen } from "@/components/ui";
import { SITE_URL } from "@/lib/config";
import { colors, fonts, radius, space, tracking } from "@/lib/theme";

export const openSite = (path: string) =>
  WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);

// The website's sign-in layout: logo, a card holding the form, a line linking
// to the other form, and the legal links.
export function AuthPage({
  heading,
  footer,
  children,
}: {
  heading: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.page}>
      <Screen>
        <View style={styles.brand}>
          <Wordmark />
        </View>
        <View style={styles.card}>
          <Text style={styles.heading} accessibilityRole="header">
            {heading}
          </Text>
          {children}
        </View>
        <View>
          {footer && <Text style={styles.footer}>{footer}</Text>}
          <View style={styles.legal}>
            <Text
              style={styles.legalLink}
              accessibilityRole="link"
              onPress={() => openSite("/privacy")}
            >
              Privacy
            </Text>
            <Text
              style={styles.legalDot}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              ·
            </Text>
            <Text
              style={styles.legalLink}
              accessibilityRole="link"
              onPress={() => openSite("/terms")}
            >
              Terms
            </Text>
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}

export const authStyles = StyleSheet.create({
  link: { color: colors.amber, fontFamily: fonts.bold, fontSize: 15 },
  hint: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.asphalt },
  brand: { paddingTop: space.xxl, paddingBottom: space.sm },
  card: {
    gap: space.lg,
    padding: space.xl,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.graphite,
    backgroundColor: colors.panel,
  },
  heading: {
    color: colors.chalk,
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: tracking(26),
  },
  footer: {
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 44,
    textAlign: "center",
  },
  legal: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
  },
  legalLink: {
    color: colors.steel,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 44,
    paddingHorizontal: space.sm,
  },
  legalDot: { color: colors.steel, fontSize: 13 },
});
