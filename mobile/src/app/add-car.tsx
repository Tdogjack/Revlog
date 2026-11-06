import { router } from "expo-router";
import { useState } from "react";
import { Field } from "@/components/fields";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors } from "@/lib/theme";

const required = (message: string) => (value: string) => (value.trim() ? null : message);

export default function AddCar() {
  const [values, setValues] = useState({
    year: "",
    make: "",
    model: "",
    trim: "",
    nickname: "",
    currentMileage: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/vehicles", { method: "POST", body: values });
      router.replace(`/car/${id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Field
        label="Year"
        value={values.year}
        onChangeText={set("year")}
        keyboardType="number-pad"
        maxLength={4}
        validate={required("Enter the year, like 2014.")}
      />
      <Field
        label="Make"
        value={values.make}
        onChangeText={set("make")}
        maxLength={50}
        validate={required("Enter the make, like Honda.")}
      />
      <Field
        label="Model"
        value={values.model}
        onChangeText={set("model")}
        maxLength={50}
        validate={required("Enter the model, like Civic.")}
      />
      <Field label="Trim (optional)" value={values.trim} onChangeText={set("trim")} />
      <Field label="Nickname (optional)" value={values.nickname} onChangeText={set("nickname")} />
      <Field
        label="Current mileage"
        value={values.currentMileage}
        onChangeText={set("currentMileage")}
        keyboardType="number-pad"
        validate={required("Enter the mileage on the odometer.")}
      />
      <Body style={{ color: colors.steel, fontSize: 14, lineHeight: 20 }}>
        Revlog starts the car with a standard service schedule you can change.
      </Body>
      <FormError message={error} />
      <Button label="Add car" busy={saving} onPress={save} />
    </Screen>
  );
}
