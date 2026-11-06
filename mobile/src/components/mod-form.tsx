import type { ModOptions, ModStatus } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { DateField, Field, SelectField } from "@/components/fields";
import { partsPayload, PartsEditor, type PartValues } from "@/components/parts-editor";
import { Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatMiles, today } from "@/lib/format";
import { useApi } from "@/lib/use-api";

export type ModValues = {
  part: string;
  brand: string;
  category: string;
  status: ModStatus;
  cost: string;
  installedOn: string;
  installedMileage: string;
  notes: string;
};

export const blankMod = (): ModValues => ({
  part: "",
  brand: "",
  category: "engine",
  status: "installed",
  cost: "",
  installedOn: today(),
  installedMileage: "",
  notes: "",
});

export function ModForm({
  carId,
  currentMileage,
  initial,
  initialParts = [],
  modId,
  children,
}: {
  carId: string;
  currentMileage: number;
  initial: ModValues;
  initialParts?: PartValues[];
  modId?: string;
  children?: React.ReactNode;
}) {
  const options = useApi<ModOptions>("/mod-options");
  const [values, setValues] = useState(initial);
  const [parts, setParts] = useState(initialParts);
  const [partError, setPartError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ModValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  if (!options.data) {
    return options.error ? <FormError message={options.error} /> : <Loading />;
  }

  const planned = values.status === "planned";

  const save = async () => {
    if (!values.part.trim()) {
      setPartError("Enter the part, like Cold air intake.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/vehicles/${carId}/mods${modId ? `/${modId}` : ""}`, {
        method: modId ? "PUT" : "POST",
        body: { ...values, parts: partsPayload(parts) },
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert("Delete this mod?", "Its photos and parts go too. This can't be undone.", [
      { text: "Keep mod", style: "cancel" },
      {
        text: "Delete mod",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/vehicles/${carId}/mods/${modId}`, { method: "DELETE" });
            router.back();
          } catch (err) {
            setError(errorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Field
        label="Part"
        placeholder="Cold air intake"
        value={values.part}
        error={partError}
        maxLength={100}
        onChangeText={(value) => {
          setPartError(null);
          set("part")(value);
        }}
      />
      <Field
        label="Brand (optional)"
        placeholder="K&N"
        value={values.brand}
        onChangeText={set("brand")}
        maxLength={60}
      />
      <SelectField
        label="Category"
        value={values.category}
        options={options.data.categories}
        onChange={set("category")}
      />
      <SelectField
        label="Status"
        value={values.status}
        options={options.data.statuses}
        onChange={set("status")}
      />
      {!planned && (
        <>
          <DateField
            label="Install date"
            value={values.installedOn || today()}
            onChange={set("installedOn")}
          />
          <Field
            label="Mileage at install (optional)"
            placeholder={formatMiles(currentMileage)}
            value={values.installedMileage}
            onChangeText={set("installedMileage")}
            keyboardType="number-pad"
          />
        </>
      )}
      <Field
        label={planned ? "Estimated cost (optional)" : "Cost (optional)"}
        placeholder="Leave blank to use the parts total"
        value={values.cost}
        onChangeText={set("cost")}
        keyboardType="decimal-pad"
      />
      <Field
        label="Notes (optional)"
        placeholder="Part number, where you bought it, install tips"
        value={values.notes}
        onChangeText={set("notes")}
        multiline
        maxLength={2000}
      />
      <PartsEditor
        label={planned ? "Parts wanted" : "Parts used"}
        parts={parts}
        onChange={setParts}
      />
      {children}
      <FormError message={error} />
      <Button label={modId ? "Save changes" : "Save mod"} busy={saving} onPress={save} />
      {modId && <Button label="Delete mod" kind="danger" onPress={remove} />}
    </Screen>
  );
}
