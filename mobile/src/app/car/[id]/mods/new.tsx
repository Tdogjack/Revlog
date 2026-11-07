import type { CarDetail } from "@revlog/api";
import { useLocalSearchParams } from "expo-router";
import { blankMod, ModForm } from "@/components/mod-form";
import { LoadFailed, Loading } from "@/components/ui";
import { useApi } from "@/lib/use-api";

export default function NewMod() {
  const { id, mileage } = useLocalSearchParams<{ id: string; mileage: string }>();
  const car = useApi<CarDetail>(`/vehicles/${id}`);
  if (!car.data) {
    return car.error ? <LoadFailed message={car.error} onRetry={car.reload} /> : <Loading />;
  }
  return (
    <ModForm
      carId={id}
      currentMileage={Number(mileage) || 0}
      canUpload={car.data.canUpload}
      initial={blankMod()}
    />
  );
}
