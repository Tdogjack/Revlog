import { HStack, Link, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { WidgetColors } from "./colors";

export type MileageCar = {
  id: string;
  name: string;
  // Already formatted, e.g. "84,210".
  mileage: string;
};

export type MileageProps = {
  signedIn: boolean;
  // In garage order, so the first car is the one at the top of the garage.
  cars: MileageCar[];
  colors: WidgetColors;
};

// A shortcut to the Update mileage screen. Small opens it for the first car
// in the garage; medium lists up to three cars, each opening its own.
function MileageWidget(props: MileageProps, env: WidgetEnvironment) {
  "widget";
  const c = props.colors;
  const family = env.widgetFamily ?? "systemSmall";
  const [first] = props.cars;

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
          MILEAGE
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 15, weight: "medium" }), foregroundStyle(c.text)]}>
          {props.signedIn ? "Add a car first" : "Sign in to log mileage"}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>Open Revlog to start.</Text>
      </VStack>
    );
  }

  if (family === "systemSmall") {
    return (
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[
          containerBackground(c.background, "widget"),
          frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
          widgetURL(`revlog://car/${first.id}/mileage`),
        ]}
      >
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted), lineLimit(1)]}>{first.name}</Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 26, weight: "semibold" }),
            foregroundStyle(c.text),
            monospacedDigit(),
            lineLimit(1),
          ]}
        >
          {first.mileage}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted)]}>miles</Text>
        <Spacer />
        <Text modifiers={[font({ size: 14, weight: "semibold" }), foregroundStyle(c.accent)]}>
          Update mileage
        </Text>
      </VStack>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        containerBackground(c.background, "widget"),
        frame({ maxWidth: 10000, maxHeight: 10000, alignment: "topLeading" }),
        widgetURL(`revlog://car/${first.id}/mileage`),
      ]}
    >
      <Text modifiers={[font({ size: 11, weight: "semibold" }), foregroundStyle(c.accent)]}>
        UPDATE MILEAGE
      </Text>
      {props.cars.slice(0, family === "systemMedium" ? 3 : 6).map((car) => (
        <Link key={car.id} destination={`revlog://car/${car.id}/mileage`}>
          <HStack spacing={8}>
            <Text modifiers={[font({ size: 14, weight: "medium" }), foregroundStyle(c.text), lineLimit(1)]}>
              {car.name}
            </Text>
            <Spacer />
            <Text
              modifiers={[font({ size: 14 }), foregroundStyle(c.muted), monospacedDigit(), lineLimit(1)]}
            >
              {`${car.mileage} mi`}
            </Text>
            <Text modifiers={[font({ size: 14, weight: "semibold" }), foregroundStyle(c.accent)]}>
              Update
            </Text>
          </HStack>
        </Link>
      ))}
      <Spacer />
    </VStack>
  );
}

export default createWidget<MileageProps>("Mileage", MileageWidget);
