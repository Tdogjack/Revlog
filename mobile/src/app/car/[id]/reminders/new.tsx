import { useLocalSearchParams } from "expo-router";
import { ReminderForm } from "@/components/reminder-form";

export default function NewReminder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReminderForm carId={id} />;
}
