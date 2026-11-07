import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Button, FormError, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatMiles, today } from "@/lib/format";
import { pressFeedback } from "@/lib/haptics";
import { colors, fonts, radius, space } from "@/lib/theme";

export default function Mileage() {
  const { id, current } = useLocalSearchParams<{ id: string; current: string }>();
  const [miles, setMiles] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const last = Number(current);

  const save = async () => {
    if (saving) return;
    const next = Number(miles);
    if (!miles || Number.isNaN(next)) {
      setError("Enter the mileage shown on the odometer.");
      return;
    }
    pressFeedback();
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
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: saving }}
              hitSlop={8}
              style={styles.headerButton}
              onPress={save}
            >
              <Text style={styles.save}>Save</Text>
            </Pressable>
          ),
        }}
      />
      <Screen>
        <View style={styles.readout}>
          <Text style={styles.label}>Odometer</Text>
          <View style={[styles.inputRow, !!error && styles.inputRowError]}>
            <TextInput
              accessibilityLabel="Current mileage in miles"
              style={styles.input}
              value={miles}
              onChangeText={(next) => {
                setError(null);
                setMiles(next.replace(/[^0-9]/g, ""));
              }}
              keyboardType="number-pad"
              selectionColor={colors.amber}
              maxLength={7}
              autoFocus
              selectTextOnFocus
            />
            <Text style={styles.unit}>mi</Text>
          </View>
          {!Number.isNaN(last) && <Body style={styles.hint}>Last reading {formatMiles(last)}</Body>}
        </View>
        <FormError message={error} />
        <Button label="Save mileage" busy={saving} onPress={save} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: { minHeight: 44, justifyContent: "center" },
  cancel: { color: colors.amber, fontFamily: fonts.regular, fontSize: 16 },
  save: { color: colors.amber, fontFamily: fonts.bold, fontSize: 16 },
  readout: { gap: space.sm },
  label: { color: colors.label, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.fieldEdge,
    backgroundColor: colors.panel,
  },
  inputRowError: { borderColor: colors.overdue },
  input: {
    flex: 1,
    color: colors.chalk,
    fontFamily: fonts.mono,
    fontSize: 36,
    lineHeight: 44,
    paddingVertical: space.sm,
  },
  unit: { color: colors.steel, fontFamily: fonts.medium, fontSize: 18 },
  hint: { color: colors.steel, fontSize: 14, lineHeight: 20 },
});
