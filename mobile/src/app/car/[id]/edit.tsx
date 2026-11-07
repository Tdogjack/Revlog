import type { CarDetail } from "@revlog/api";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { CarForm } from "@/components/car-form";
import { Field } from "@/components/fields";
import { Body, Button, FormError, LoadFailed, Loading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

// Removing a car deletes everything about it, so it asks for the car's name first.
function RemoveCar({ carId, name }: { carId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      await api(`/vehicles/${carId}`, { method: "DELETE", body: { confirm } });
      router.dismissTo("/");
    } catch (err) {
      setError(errorMessage(err));
      setRemoving(false);
    }
  };

  if (!open) return <Button label="Remove this car" kind="danger" onPress={() => setOpen(true)} />;

  return (
    <View style={styles.remove}>
      <Body style={styles.muted}>
        Permanently deletes {name} with its service history, mods, reminders, parts, photos, and
        any community posts about it. This can&apos;t be undone.
      </Body>
      <Field
        label={`Type ${name} to confirm`}
        value={confirm}
        onChangeText={setConfirm}
        autoCorrect={false}
      />
      <FormError message={error} />
      <Button label="Remove car" kind="danger" busy={removing} onPress={remove} />
      <Button label="Keep car" kind="secondary" onPress={() => setOpen(false)} />
    </View>
  );
}

export default function EditCar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: car, error, reload } = useApi<CarDetail>(`/vehicles/${id}`);

  if (!car) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  // Every field goes back on save, so anything left out here would be cleared.
  const [builtYear = "", builtMonth = ""] = car.builtOn?.split("-") ?? [];

  return (
    <CarForm
      initial={{
        year: String(car.year),
        make: car.make,
        model: car.model,
        trim: car.trim ?? "",
        nickname: car.nickname ?? "",
        vin: car.vin ?? "",
        currentMileage: String(car.currentMileage),
        builtMonth,
        builtYear,
      }}
      submitLabel="Save changes"
      onSave={async (values) => {
        await api(`/vehicles/${id}`, { method: "PUT", body: values });
        router.back();
      }}
    >
      <RemoveCar carId={id} name={car.nickname ?? car.name} />
    </CarForm>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.steel },
  remove: { gap: space.md },
});
