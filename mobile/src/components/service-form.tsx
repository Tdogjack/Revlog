import type { ExtraService, ScannedReceipt, ServiceType } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { DateField, Field, SelectField } from "@/components/fields";
import { partsPayload, PartsEditor, scannedPart, type PartValues } from "@/components/parts-editor";
import { ScanBox } from "@/components/scan-box";
import { Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { today } from "@/lib/format";
import { photoForm } from "@/lib/photos";
import { useApi } from "@/lib/use-api";
import { colors, fonts } from "@/lib/theme";

// Matches NEW_TYPE on the server: the option that names a new service type.
const NEW_TYPE = "__new";

export type ServiceValues = {
  category: string;
  title: string;
  servicedOn: string;
  mileage: string;
  cost: string;
  shop: string;
  notes: string;
};

export const blankService = (): ServiceValues => ({
  category: "",
  title: "",
  servicedOn: today(),
  mileage: "",
  cost: "",
  shop: "",
  notes: "",
});

export function ServiceForm({
  carId,
  initial,
  recordId,
  reminderId,
  initialParts = [],
  canUpload = true,
  children,
}: {
  carId: string;
  initial: ServiceValues;
  recordId?: string;
  reminderId?: string;
  initialParts?: PartValues[];
  canUpload?: boolean;
  children?: React.ReactNode;
}) {
  const types = useApi<ServiceType[]>("/service-types");
  const [values, setValues] = useState(initial);
  const [parts, setParts] = useState(initialParts);
  const [extras, setExtras] = useState<ExtraService[]>([]);
  const [scannedPhoto, setScannedPhoto] = useState<string | null>(null);
  const [newType, setNewType] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ServiceValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  if (!types.data) return <Loading />;

  // Keeps what's already typed wherever the photo had nothing, and adds the
  // photo's parts after any already listed.
  const applyScan = (scan: ScannedReceipt, photoUri: string) => {
    const found = Object.fromEntries(Object.entries(scan.values).filter(([, v]) => v));
    setValues((v) => ({ ...v, ...found }));
    setParts((current) => [...current, ...scan.parts.map(scannedPart)]);
    setExtras(scan.extras);
    setScannedPhoto(photoUri);
    setTypeError(null);
  };

  const save = async () => {
    if (!values.category) {
      setTypeError("Pick what kind of service this was.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...values,
        newType,
        reminderId,
        parts: partsPayload(parts),
        extraServices: extras.length > 0 ? JSON.stringify(extras) : undefined,
      };
      const saved = await api<{ id?: string }>(
        `/vehicles/${carId}/service${recordId ? `/${recordId}` : ""}`,
        { method: recordId ? "PUT" : "POST", body },
      );
      // The record is saved by now, so a failed photo doesn't lose it.
      if (scannedPhoto && saved.id) {
        await api(`/vehicles/${carId}/photos`, {
          method: "POST",
          form: photoForm(scannedPhoto, { kind: "record", targetId: saved.id }),
        }).catch(() => Alert.alert("Service saved", "The scanned photo didn't upload."));
      }
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert("Delete this record?", "Its photos and parts go too. This can't be undone.", [
      { text: "Keep record", style: "cancel" },
      {
        text: "Delete record",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/vehicles/${carId}/service/${recordId}`, { method: "DELETE" });
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
      {!recordId && (
        <ScanBox<ScannedReceipt>
          path="/scans/receipt"
          label="Scan a receipt"
          intro="Scan a receipt and the form fills itself in."
          canUpload={canUpload}
          onScanned={applyScan}
        />
      )}
      <SelectField
        label="Service"
        value={values.category}
        error={typeError}
        options={[...types.data, { value: NEW_TYPE, label: "New service type" }]}
        onChange={(value) => {
          setTypeError(null);
          set("category")(value);
        }}
      />
      {values.category === NEW_TYPE && (
        <Field label="New service type" value={newType} onChangeText={setNewType} maxLength={60} />
      )}
      <Field
        label="Title (optional)"
        value={values.title}
        onChangeText={set("title")}
        maxLength={100}
      />
      <DateField label="Date" value={values.servicedOn} onChange={set("servicedOn")} />
      <Field
        label="Mileage"
        value={values.mileage}
        onChangeText={set("mileage")}
        keyboardType="number-pad"
      />
      <Field
        label="Cost (optional)"
        value={values.cost}
        onChangeText={set("cost")}
        keyboardType="decimal-pad"
      />
      <Field
        label="Shop (optional)"
        value={values.shop}
        onChangeText={set("shop")}
        maxLength={100}
      />
      <Field
        label="Notes (optional)"
        value={values.notes}
        onChangeText={set("notes")}
        multiline
        maxLength={2000}
      />
      <PartsEditor label="Parts used" parts={parts} onChange={setParts} />
      {extras.length > 0 && (
        <Text style={{ color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          Also on this receipt, saved as separate records:{" "}
          {extras.map((e) => e.title).join(", ")}.
        </Text>
      )}
      {children}
      <FormError message={error} />
      <Button label={recordId ? "Save changes" : "Log service"} busy={saving} onPress={save} />
      {recordId && <Button label="Delete record" kind="danger" onPress={remove} />}
    </Screen>
  );
}
