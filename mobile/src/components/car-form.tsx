import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Field, SelectField } from "@/components/fields";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, space } from "@/lib/theme";

export type CarValues = {
  year: string;
  make: string;
  model: string;
  trim: string;
  nickname: string;
  vin: string;
  currentMileage: string;
  builtMonth: string;
  builtYear: string;
};

export const blankCar = (): CarValues => ({
  year: "",
  make: "",
  model: "",
  trim: "",
  nickname: "",
  vin: "",
  currentMileage: "",
  builtMonth: "",
  builtYear: "",
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

const required = (message: string) => (value: string) => (value.trim() ? null : message);

type Decoded = { year: string; make: string; model: string; trim: string };

export function CarForm({
  initial,
  submitLabel,
  hint,
  onSave,
  children,
}: {
  initial: CarValues;
  submitLabel: string;
  hint?: string;
  onSave: (values: CarValues) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [vinNote, setVinNote] = useState<string | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const set = (key: keyof CarValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const lookUp = async () => {
    setLooking(true);
    setVinNote(null);
    setVinError(null);
    try {
      const car = await api<Decoded>("/vin", { method: "POST", body: { vin: values.vin } });
      const found = Object.fromEntries(Object.entries(car).filter(([, v]) => v));
      setValues((v) => ({ ...v, ...found }));
      const name = [car.year, car.make, car.model, car.trim].filter(Boolean).join(" ");
      setVinNote(`Found a ${name}. Check the details below.`);
    } catch (err) {
      setVinError(errorMessage(err));
    } finally {
      setLooking(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Field
        label="VIN (optional)"
        value={values.vin}
        onChangeText={set("vin")}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={20}
      />
      <Button label="Look up VIN" kind="secondary" busy={looking} onPress={lookUp} />
      {vinNote && <Body style={styles.note}>{vinNote}</Body>}
      <FormError message={vinError} />
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
      <Field label="Trim (optional)" value={values.trim} onChangeText={set("trim")} maxLength={100} />
      <Field
        label="Nickname (optional)"
        value={values.nickname}
        onChangeText={set("nickname")}
        maxLength={100}
      />
      <Field
        label="Current mileage"
        value={values.currentMileage}
        onChangeText={set("currentMileage")}
        keyboardType="number-pad"
        validate={required("Enter the mileage on the odometer.")}
      />
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <SelectField
            label="Built in (optional)"
            placeholder="Month"
            value={values.builtMonth}
            options={[{ value: "", label: "Not set" }, ...MONTHS]}
            onChange={set("builtMonth")}
          />
        </View>
        <View style={styles.pairItem}>
          <Field
            label="Build year"
            value={values.builtYear}
            onChangeText={set("builtYear")}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      {hint && <Body style={styles.hint}>{hint}</Body>}
      <FormError message={error} />
      <Button label={submitLabel} busy={saving} onPress={save} />
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: space.md },
  pairItem: { flex: 1 },
  note: { color: colors.done, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
