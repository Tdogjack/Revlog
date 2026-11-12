import type { GarageCar } from "@revlog/api";
import { colors } from "@/lib/theme";
import type { WidgetColors } from "@/widgets/colors";
import Mileage from "@/widgets/Mileage";
import NextService, { type NextServiceItem } from "@/widgets/NextService";

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
  const c = widgetColors();
  NextService.updateSnapshot({ signedIn: false, items: [], colors: c });
  Mileage.updateSnapshot({ signedIn: false, cars: [], colors: c });
}
