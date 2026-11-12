import type { GarageCar } from "@revlog/api";
import { requireOptionalNativeModule } from "expo";
import { colors } from "@/lib/theme";
import type { WidgetColors } from "@/widgets/colors";
import type MileageWidget from "@/widgets/Mileage";
import type NextServiceWidget from "@/widgets/NextService";
import type { NextServiceItem } from "@/widgets/NextService";

// A build made before the widgets were added has no widget module, and
// loading the widget files there crashes the app on launch. So they load only
// when the module is in the build; otherwise widget updates do nothing.
/* eslint-disable @typescript-eslint/no-require-imports */
const widgets = requireOptionalNativeModule("ExpoWidgets")
  ? {
      Mileage: require("@/widgets/Mileage").default as typeof MileageWidget,
      NextService: require("@/widgets/NextService").default as typeof NextServiceWidget,
    }
  : null;
/* eslint-enable @typescript-eslint/no-require-imports */

const RANK: Record<string, number> = { overdue: 0, due_soon: 1, ok: 2, unknown: 3 };

const widgetColors = (): WidgetColors => ({
  background: colors.asphalt,
  text: colors.chalk,
  muted: colors.steel,
  accent: colors.amber,
  due: colors.due,
  overdue: colors.overdue,
});

// Called whenever the garage loads, so the home screen widgets show the
// latest reminders and mileage.
export function updateWidgets(cars: GarageCar[]) {
  if (!widgets) return;
  const { Mileage, NextService } = widgets;
  const items: NextServiceItem[] = cars
    .flatMap((car) =>
      car.nextReminder
        ? [
            {
              carId: car.id,
              carName: car.nickname || car.name,
              task: car.nextReminder.task,
              status: car.nextReminder.status,
              due: car.nextReminder.due,
            },
          ]
        : [],
    )
    .sort((a, b) => RANK[a.status] - RANK[b.status]);
  const c = widgetColors();
  NextService.updateSnapshot({ signedIn: true, items, colors: c });
  Mileage.updateSnapshot({
    signedIn: true,
    cars: cars.map((car) => ({
      id: car.id,
      name: car.nickname || car.name,
      mileage: car.currentMileage.toLocaleString("en-US"),
    })),
    colors: c,
  });
}

// After logging out, so the widgets don't keep showing the last person's cars.
export function clearWidgets() {
  if (!widgets) return;
  const { Mileage, NextService } = widgets;
  const c = widgetColors();
  NextService.updateSnapshot({ signedIn: false, items: [], colors: c });
  Mileage.updateSnapshot({ signedIn: false, cars: [], colors: c });
}
