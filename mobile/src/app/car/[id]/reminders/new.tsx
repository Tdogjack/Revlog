import type { CarDetail } from "@revlog/api";
import { useLocalSearchParams } from "expo-router";
import { ReminderForm } from "@/components/reminder-form";
import { LoadFailed, Loading } from "@/components/ui";
import { useApi } from "@/lib/use-api";

export default function NewReminder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);
  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;
  return <ReminderForm carId={id} intervals={car.reminderIntervals ?? {}} />;
}
