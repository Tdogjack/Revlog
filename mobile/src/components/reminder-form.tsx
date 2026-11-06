import type { CarReminder, ServiceType } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Field, SelectField } from "@/components/fields";
import { Body, Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { today } from "@/lib/format";
import { colors } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export function ReminderForm({ carId, reminder }: { carId: string; reminder?: CarReminder }) {
  const types = useApi<ServiceType[]>("/service-types");
  const [category, setCategory] = useState(reminder?.serviceCategory ?? "");
  const [task, setTask] = useState(reminder?.task ?? "");
  const [miles, setMiles] = useState(reminder?.intervalMiles?.toString() ?? "");
  const [months, setMonths] = useState(reminder?.intervalMonths?.toString() ?? "");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const path = `/vehicles/${carId}/reminders`;

  if (!types.data) return <Loading />;

  const save = async () => {
    if (!category) {
      setTypeError("Pick the service to be reminded about.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(reminder ? `${path}/${reminder.id}` : path, {
        method: reminder ? "PUT" : "POST",
        body: { category, task, intervalMiles: miles, intervalMonths: months, today: today() },
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const act = async (work: () => Promise<unknown>) => {
    try {
      await work();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = () => {
    Alert.alert("Delete this reminder?", "Service history stays. This can't be undone.", [
      { text: "Keep reminder", style: "cancel" },
      {
        text: "Delete reminder",
        style: "destructive",
        onPress: () => act(() => api(`${path}/${reminder?.id}`, { method: "DELETE" })),
      },
    ]);
  };

  return (
    <Screen>
      <SelectField
        label="Service"
        value={category}
        options={types.data}
        error={typeError}
        onChange={(value) => {
          setTypeError(null);
          setCategory(value);
        }}
      />
      <Field label="Name (optional)" value={task} onChangeText={setTask} maxLength={100} />
      <Field
        label="Every how many miles"
        value={miles}
        onChangeText={setMiles}
        keyboardType="number-pad"
      />
      <Field
        label="Every how many months"
        value={months}
        onChangeText={setMonths}
        keyboardType="number-pad"
      />
      <Body style={{ color: colors.steel, fontSize: 14, lineHeight: 20 }}>
        Set miles, months, or both. Whichever comes first makes it due.
      </Body>
      <FormError message={error} />
      <Button label={reminder ? "Save changes" : "Add reminder"} busy={saving} onPress={save} />
      {reminder?.status === "unknown" && (
        <Button
          label="Mark as never done"
          kind="secondary"
          onPress={() =>
            act(() => api(`${path}/${reminder.id}/never-done`, { method: "POST", body: {} }))
          }
        />
      )}
      {reminder && <Button label="Delete reminder" kind="danger" onPress={remove} />}
    </Screen>
  );
}
