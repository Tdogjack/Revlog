import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const supported = Platform.OS === "ios" || Platform.OS === "android";
const quietly = (feedback: () => Promise<void>) => {
  // A phone without a vibration motor should never fail a tap.
  if (supported) feedback().catch(() => undefined);
};

export const tapFeedback = () => quietly(() => Haptics.selectionAsync());

export const pressFeedback = () =>
  quietly(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
