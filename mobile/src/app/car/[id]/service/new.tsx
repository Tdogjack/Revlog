import type { CarDetail } from "@revlog/api";
import { useLocalSearchParams } from "expo-router";
import { blankService, ServiceForm } from "@/components/service-form";
import { LoadFailed, Loading } from "@/components/ui";
import { useApi } from "@/lib/use-api";

export default function NewService() {
  const { id, reminderId, category, title } = useLocalSearchParams<{
    id: string;
    reminderId?: string;
    category?: string;
    title?: string;
  }>();
  const car = useApi<CarDetail>(`/vehicles/${id}`);
  if (!car.data) {
    return car.error ? <LoadFailed message={car.error} onRetry={car.reload} /> : <Loading />;
  }
  return (
    <ServiceForm
      carId={id}
      reminderId={reminderId}
      canUpload={car.data.canUpload}
      initial={{
        ...blankService(),
        category: category ?? "",
        title: title ?? "",
        // Most services get logged the day they happen, at today's mileage.
        mileage: String(car.data.currentMileage),
      }}
    />
  );
}
