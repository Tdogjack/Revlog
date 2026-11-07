import type { ModOptions, ModStatus, ScannedMod } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { DateField, Field, SelectField } from "@/components/fields";
import { partsPayload, PartsEditor, scannedPart, type PartValues } from "@/components/parts-editor";
import { ScanBox } from "@/components/scan-box";
import { Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatMiles, today } from "@/lib/format";
import { photoForm } from "@/lib/photos";
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
  canUpload = true,
  children,
}: {
  carId: string;
  currentMileage: number;
  initial: ModValues;
  initialParts?: PartValues[];
  modId?: string;
  canUpload?: boolean;
  children?: React.ReactNode;
}) {
  const options = useApi<ModOptions>("/mod-options");
  const [values, setValues] = useState(initial);
  const [parts, setParts] = useState(initialParts);
  const [partError, setPartError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scannedPhoto, setScannedPhoto] = useState<string | null>(null);
  const set = (key: keyof ModValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  if (!options.data) {
    return options.error ? <FormError message={options.error} /> : <Loading />;
  }

  const planned = values.status === "planned";

  // Keeps what's already typed wherever the photo had nothing, and adds the
  // photo's items after any parts already listed.
  const applyScan = (scan: ScannedMod, photoUri: string) => {
    const found = Object.fromEntries(Object.entries(scan.values).filter(([, v]) => v));
    setValues((v) => ({ ...v, ...found }));
    setParts((current) => [...current, ...scan.parts.map(scannedPart)]);
    setScannedPhoto(photoUri);
  };

  const save = async () => {
    if (!values.part.trim()) {
      setPartError("Enter the part, like Cold air intake.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api<{ id?: string }>(`/vehicles/${carId}/mods${modId ? `/${modId}` : ""}`, {
        method: modId ? "PUT" : "POST",
        body: { ...values, parts: partsPayload(parts) },
      });
      // The mod is saved by now, so a failed photo doesn't lose it.
      if (scannedPhoto && saved.id) {
        await api(`/vehicles/${carId}/photos`, {
          method: "POST",
          form: photoForm(scannedPhoto, { kind: "mod", targetId: saved.id }),
        }).catch(() => Alert.alert("Mod saved", "The scanned photo didn't upload."));
      }
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
      {!modId && (
        <ScanBox<ScannedMod>
          path="/scans/mod"
          label="Scan a receipt or listing"
          intro="Have an order email, receipt, or listing? Scan it and the form fills itself in."
          canUpload={canUpload}
          onScanned={applyScan}
        />
      )}
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
