import type { CarReminder, ReminderInterval, ServiceType } from "@revlog/api";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { DateField, Field, SelectField } from "@/components/fields";
import { Body, Button, FormError, Loading, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatMiles, today } from "@/lib/format";
import { colors } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

// Matches NEW_TYPE on the server: the option that names a new service type.
const NEW_TYPE = "__new";

export function ReminderForm({
  carId,
  reminder,
  intervals = {},
}: {
  carId: string;
  reminder?: CarReminder;
  // Usual intervals for this car by service type, filled in when one is picked.
  intervals?: Record<string, ReminderInterval>;
}) {
  const types = useApi<ServiceType[]>("/service-types");
  const [category, setCategory] = useState(reminder?.serviceCategory ?? "");
  const [newType, setNewType] = useState("");
  const [task, setTask] = useState(reminder?.task ?? "");
  const [miles, setMiles] = useState(reminder?.intervalMiles?.toString() ?? "");
  const [months, setMonths] = useState(reminder?.intervalMonths?.toString() ?? "");
  const [lastDone, setLastDone] = useState(false);
  const [lastDoneOn, setLastDoneOn] = useState(today());
  const [lastDoneMileage, setLastDoneMileage] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const path = `/vehicles/${carId}/reminders`;

  if (!types.data) return <Loading />;

  const pickType = (value: string) => {
    setTypeError(null);
    setCategory(value);
    // Common intervals fill in; other types keep what's typed.
    const usual = intervals[value];
    if (usual) {
      setMiles(usual.intervalMiles?.toString() ?? "");
      setMonths(usual.intervalMonths?.toString() ?? "");
    }
  };

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
        body: {
          category,
          newType,
          task,
          intervalMiles: miles,
          intervalMonths: months,
          lastDoneOn: lastDone ? lastDoneOn : "",
          lastDoneMileage: lastDone ? lastDoneMileage : "",
          today: today(),
        },
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
        options={[...types.data, { value: NEW_TYPE, label: "New service type" }]}
        error={typeError}
        onChange={pickType}
      />
      {category === NEW_TYPE && (
        <Field label="New service type" value={newType} onChangeText={setNewType} maxLength={60} />
      )}
      <Field
        label="Every how many miles"
        placeholder="5,000"
        value={miles}
        onChangeText={setMiles}
        keyboardType="number-pad"
      />
      <Field
        label="Or every how many months"
        placeholder="6"
        value={months}
        onChangeText={setMonths}
        keyboardType="number-pad"
      />
      <Body style={styles.hint}>
        Whichever comes first makes it due. Common intervals fill in when you pick a service. Check
        your owner&apos;s manual and adjust them.
      </Body>

      {reminder ? (
        <Body style={styles.hint}>
          {reminder.lastDoneOn
            ? `Last done ${formatDate(reminder.lastDoneOn)}${
                reminder.lastDoneMileage != null
                  ? ` at ${formatMiles(reminder.lastDoneMileage)}`
                  : ""
              }. `
            : ""}
          Last done comes from your service log. To change it, log or edit the service.
        </Body>
      ) : lastDone ? (
        <>
          <DateField label="Last done" value={lastDoneOn} onChange={setLastDoneOn} />
          <Field
            label="Mileage then (optional)"
            value={lastDoneMileage}
            onChangeText={setLastDoneMileage}
            keyboardType="number-pad"
          />
          <Body style={styles.hint}>This adds the service to your log.</Body>
          <Button label="Leave last done blank" kind="secondary" onPress={() => setLastDone(false)} />
        </>
      ) : (
        <>
          <Button label="Add when it was last done" kind="secondary" onPress={() => setLastDone(true)} />
          <Body style={styles.hint}>
            Skip this if you&apos;ve already logged it, or if it&apos;s never been done.
          </Body>
        </>
      )}

      <Field
        label="Name (optional)"
        placeholder="Uses the service name"
        value={task}
        onChangeText={setTask}
        maxLength={100}
      />
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

const styles = StyleSheet.create({
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
