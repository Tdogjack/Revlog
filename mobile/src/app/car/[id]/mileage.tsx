import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Field } from "@/components/fields";
import { Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { today } from "@/lib/format";

export default function Mileage() {
  const { id, current } = useLocalSearchParams<{ id: string; current: string }>();
  const [miles, setMiles] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/vehicles/${id}/mileage`, {
        method: "POST",
        body: { currentMileage: miles, readOn: today() },
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Field
        label="Current mileage"
        value={miles}
        onChangeText={setMiles}
        keyboardType="number-pad"
        autoFocus
        selectTextOnFocus
      />
      <FormError message={error} />
      <Button label="Save mileage" busy={saving} onPress={save} />
    </Screen>
  );
}
