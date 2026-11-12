import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { WidgetColors } from "./colors";

export type NextServiceItem = {
  carId: string;
  carName: string;
  task: string;
  // "overdue" | "due_soon" | "ok" | "unknown", as plain text so the widget
  // bundle needs no imports.
  status: string;
  due: string;
};

export type NextServiceProps = {
  signedIn: boolean;
  // Most urgent first, at most one per car.
  items: NextServiceItem[];
  colors: WidgetColors;
};

// The most urgent service across the garage. Small shows one, medium up to
// three, and the lock screen one line. Tapping opens that car.
function NextServiceWidget(props: NextServiceProps, env: WidgetEnvironment) {
  "widget";
  const c = props.colors;
  const family = env.widgetFamily ?? "systemSmall";
  const statusColor = (status: string) =>
    status === "overdue" ? c.overdue : status === "due_soon" ? c.due : c.muted;
  const statusLabel = (status: string) =>
    status === "overdue" ? "OVERDUE" : status === "due_soon" ? "DUE SOON" : "NEXT UP";
  const [first] = props.items;

  if (family === "accessoryRectangular" || family === "accessoryInline") {
    const text = !props.signedIn
      ? "Sign in to Revlog"
      : first
        ? `${first.task}: ${first.due}`
        : "No reminders yet";
    return (
      <VStack
        alignment="leading"
        spacing={1}
        modifiers={[
          containerBackground("clear", "widget"),
          ...(first ? [widgetURL(`revlog://car/${first.carId}`)] : []),
        ]}
      >
        {family === "accessoryRectangular" && first && (
          <Text modifiers={[font({ size: 13, weight: "semibold" }), lineLimit(1)]}>
            {first.carName}
          </Text>
        )}
        <Text modifiers={[font({ size: 13 }), lineLimit(2)]}>{text}</Text>
      </VStack>
    );
  }

  if (!props.signedIn || !first) {
    return (
      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          containerBackground(c.background, "widget"),
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
        ]}
      >
        <Text modifiers={[font({ size: 12, weight: "semibold" }), foregroundStyle(c.accent)]}>
          REVLOG
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: "medium" }), foregroundStyle(c.text)]}>
          {props.signedIn ? "No reminders yet" : "Sign in to see what's due"}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>
          {props.signedIn ? "Add one from a car's page." : "Open Revlog to sign in."}
        </Text>
      </VStack>
    );
  }

  if (family === "systemSmall") {
    return (
      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[
          containerBackground(c.background, "widget"),
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
          widgetURL(`revlog://car/${first.carId}`),
        ]}
      >
        <Text
          modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(statusColor(first.status))]}
        >
          {statusLabel(first.status)}
        </Text>
        <Text
          modifiers={[font({ size: 17, weight: "semibold" }), foregroundStyle(c.text), lineLimit(2)]}
        >
          {first.task}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 13 }), foregroundStyle(c.text), lineLimit(2)]}>{first.due}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted), lineLimit(1)]}>
          {first.carName}
        </Text>
      </VStack>
    );
  }

  // Medium and larger: one row per car, each opening its car.
  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        containerBackground(c.background, "widget"),
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
        widgetURL("revlog://"),
      ]}
    >
      <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(c.accent)]}>
        NEXT SERVICE
      </Text>
      {props.items.slice(0, family === "systemMedium" ? 3 : 6).map((item) => (
        <HStack key={item.carId} spacing={8}>
          <VStack alignment="leading" spacing={1}>
            <Text
              modifiers={[font({ size: 14, weight: "semibold" }), foregroundStyle(c.text), lineLimit(1)]}
            >
              {item.task}
            </Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted), lineLimit(1)]}>
              {item.carName}
            </Text>
          </VStack>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 12, weight: "medium" }),
              foregroundStyle(statusColor(item.status)),
              lineLimit(2),
              padding({ leading: 4 }),
            ]}
          >
            {item.due}
          </Text>
        </HStack>
      ))}
      <Spacer />
    </VStack>
  );
}

export default createWidget<NextServiceProps>("NextService", NextServiceWidget);
