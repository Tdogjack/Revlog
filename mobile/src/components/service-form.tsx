import type { ServiceType } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { DateField, Field, SelectField } from "@/components/fields";
import { Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { today } from "@/lib/format";
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
  partCount = 0,
  children,
}: {
  carId: string;
  initial: ServiceValues;
  recordId?: string;
  reminderId?: string;
  partCount?: number;
  children?: React.ReactNode;
}) {
  const types = useApi<ServiceType[]>("/service-types");
  const [values, setValues] = useState(initial);
  const [newType, setNewType] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ServiceValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  if (!types.data) return <Loading />;

  const save = async () => {
    if (!values.category) {
      setTypeError("Pick what kind of service this was.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // No "parts" here, so anything added on the website stays on the record.
      const body = { ...values, newType, reminderId };
      await api(`/vehicles/${carId}/service${recordId ? `/${recordId}` : ""}`, {
        method: recordId ? "PUT" : "POST",
        body,
      });
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
      {partCount > 0 && (
        <Text style={{ color: colors.steel, fontFamily: fonts.regular, fontSize: 14 }}>
          {partCount === 1 ? "1 part is" : `${partCount} parts are`} saved with this record. Edit
          parts on revlog.me.
        </Text>
      )}
      {children}
      <FormError message={error} />
      <Button label={recordId ? "Save changes" : "Log service"} busy={saving} onPress={save} />
      {recordId && <Button label="Delete record" kind="danger" onPress={remove} />}
    </Screen>
  );
}
