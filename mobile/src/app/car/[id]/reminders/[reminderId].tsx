import type { CarDetail } from "@revlog/api";
import { useLocalSearchParams } from "expo-router";
import { ReminderForm } from "@/components/reminder-form";
import { LoadFailed, Loading } from "@/components/ui";
import { useApi } from "@/lib/use-api";

export default function EditReminder() {
  const { id, reminderId } = useLocalSearchParams<{ id: string; reminderId: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);

  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;
  const reminder = car.reminders.find((r) => r.id === reminderId);
  if (!reminder) return <LoadFailed message="That reminder wasn't found." onRetry={reload} />;
  return <ReminderForm carId={id} reminder={reminder} />;
}
