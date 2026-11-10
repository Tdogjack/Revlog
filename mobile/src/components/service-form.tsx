import type { ExtraService, ScannedReceipt, ServiceType } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { DateField, Field, SelectField } from "@/components/fields";
import { partsPayload, PartsEditor, scannedPart, type PartValues } from "@/components/parts-editor";
import { ScanBox } from "@/components/scan-box";
import { Body, Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatMiles, today } from "@/lib/format";
import { photoForm } from "@/lib/photos";
import { useApi } from "@/lib/use-api";
import { colors, fonts, radius, space } from "@/lib/theme";

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
  currentMileage,
  note,
  children,
}: {
  carId: string;
  initial: ServiceValues;
  recordId?: string;
  reminderId?: string;
  initialParts?: PartValues[];
  canUpload?: boolean;
  currentMileage?: number;
  // Says where the starting values came from, like a copied record.
  note?: string;
  children?: React.ReactNode;
}) {
  const types = useApi<ServiceType[]>("/service-types");
  const [values, setValues] = useState(initial);
  const [parts, setParts] = useState(initialParts);
  const [extras, setExtras] = useState<(ExtraService & { keep: boolean })[]>([]);
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
    setExtras(scan.extras.map((e) => ({ ...e, keep: true })));
    setScannedPhoto(photoUri);
    setTypeError(null);
  };

  // Dropping an extra service moves its price back onto this record, so the
  // records still add up to the receipt total.
  const keepExtra = (index: number, keep: boolean) => {
    const extra = extras[index];
    const current = Number(values.cost.replace(/[$,]/g, ""));
    if (values.cost && Number.isFinite(current)) {
      const change = (Number(extra.cost) || 0) * (keep ? -1 : 1);
      set("cost")(Math.max(0, current + change).toFixed(2));
    }
    setExtras(extras.map((e, i) => (i === index ? { ...e, keep } : e)));
  };

  const save = async () => {
    if (!values.category) {
      setTypeError("Pick what kind of service this was.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const kept = extras
        .filter((e) => e.keep)
        .map(({ category, title, cost }) => ({ category, title, cost }));
      const body = {
        ...values,
        newType,
        reminderId,
        parts: partsPayload(parts),
        extraServices: kept.length > 0 ? JSON.stringify(kept) : undefined,
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
      {note && <Text style={styles.note}>{note}</Text>}
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
        label="Description (optional)"
        placeholder="Full synthetic 0W-20 and filter"
        value={values.title}
        onChangeText={set("title")}
        maxLength={100}
      />
      <DateField label="Date" value={values.servicedOn} onChange={set("servicedOn")} />
      <Field
        label="Mileage (optional)"
        placeholder={currentMileage != null ? formatMiles(currentMileage) : undefined}
        value={values.mileage}
        onChangeText={set("mileage")}
        keyboardType="number-pad"
      />
      <Field
        label="Cost (optional)"
        placeholder="Leave blank to use the parts total"
        value={values.cost}
        onChangeText={set("cost")}
        keyboardType="decimal-pad"
      />
      <Field
        label="Shop (optional)"
        placeholder="Did it myself"
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
      <PartsEditor label="Parts used" parts={parts} onChange={setParts} carId={carId} />
      {extras.length > 0 && (
        <View style={styles.extras}>
          <Text style={styles.extrasHeading}>Other services on this receipt</Text>
          <Body style={styles.hint}>
            Each one you keep is saved as its own record with the same date, mileage, and shop.
          </Body>
          <View style={styles.extrasList}>
            {extras.map((extra, i) => (
              <View key={i} style={styles.extra}>
                <View style={styles.extraText}>
                  <Text style={[styles.extraTitle, !extra.keep && styles.extraDropped]}>
                    {extra.title}
                  </Text>
                  <Text style={styles.hint}>
                    {Number(extra.cost) > 0 ? `$${extra.cost}` : extra.cost ? "No charge" : "No price"}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`Keep ${extra.title}`}
                  value={extra.keep}
                  trackColor={{ true: colors.amber, false: colors.graphite }}
                  onValueChange={(keep) => keepExtra(i, keep)}
                />
              </View>
            ))}
          </View>
        </View>
      )}
      {children}
      <FormError message={error} />
      <Button label={recordId ? "Save changes" : "Log service"} busy={saving} onPress={save} />
      {recordId && <Button label="Delete record" kind="danger" onPress={remove} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.graphite,
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
  extras: { gap: space.sm },
  extrasHeading: { color: colors.label, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  extrasList: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  extra: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  extraText: { flex: 1, gap: 2 },
  extraTitle: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  extraDropped: { color: colors.steel, textDecorationLine: "line-through" },
});
