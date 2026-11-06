import { useLocalSearchParams } from "expo-router";
import { blankMod, ModForm } from "@/components/mod-form";

export default function NewMod() {
  const { id, mileage } = useLocalSearchParams<{ id: string; mileage: string }>();
  return <ModForm carId={id} currentMileage={Number(mileage) || 0} initial={blankMod()} />;
}
