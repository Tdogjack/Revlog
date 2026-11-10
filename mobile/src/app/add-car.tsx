import type { Me } from "@revlog/api";
import { router } from "expo-router";
import { Alert } from "react-native";
import { blankCar, CarForm } from "@/components/car-form";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function AddCar() {
  const me = useApi<Me>("/me");
  return (
    <CarForm
      isNew
      initial={blankCar()}
      submitLabel="Add car"
      canUpload={me.data?.emailVerified ?? false}
      onSave={async (values, answers, photo) => {
        const { id } = await api<{ id: string }>("/vehicles", {
          method: "POST",
          body: { ...values, ...answers },
        });
        // The car is saved by now, so a failed photo doesn't lose it.
        if (photo) {
          await api(`/vehicles/${id}/photo`, { method: "POST", form: photo.form }).catch(() =>
            Alert.alert("Car added", "The photo didn't upload. Add it from the car's page."),
          );
        }
        router.replace(`/car/${id}`);
      }}
    />
  );
}
