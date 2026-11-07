import { router } from "expo-router";
import { blankCar, CarForm } from "@/components/car-form";
import { api } from "@/lib/api";

export default function AddCar() {
  return (
    <CarForm
      initial={blankCar()}
      submitLabel="Add car"
      hint="Revlog starts the car with a standard service schedule you can change."
      onSave={async (values) => {
        const { id } = await api<{ id: string }>("/vehicles", { method: "POST", body: values });
        router.replace(`/car/${id}`);
      }}
    />
  );
}
