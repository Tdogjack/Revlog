import { useLocalSearchParams } from "expo-router";
import { blankService, ServiceForm } from "@/components/service-form";

export default function NewService() {
  const { id, reminderId, category, title } = useLocalSearchParams<{
    id: string;
    reminderId?: string;
    category?: string;
    title?: string;
  }>();
  return (
    <ServiceForm
      carId={id}
      reminderId={reminderId}
      initial={{ ...blankService(), category: category ?? "", title: title ?? "" }}
    />
  );
}
