import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { formatDate, fromIsoDate, toIsoDate } from "@/lib/format";
import { colors, fonts, MAX_WIDTH, space } from "@/lib/theme";

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text style={styles.error} accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

type FieldProps = Omit<TextInputProps, "value" | "onChangeText" | "onBlur"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  // Checked when the person leaves the field. Returns what to fix, or null.
  validate?: (value: string) => string | null;
  error?: string | null;
};

export function Field({ label, value, onChangeText, validate, error, ...input }: FieldProps) {
  const [blurError, setBlurError] = useState<string | null>(null);
  const [engaged, setEngaged] = useState(false);
  const message = engaged ? null : (blurError ?? error);
  return (
    <View style={styles.field}>
      <Label text={label} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.amber}
        {...input}
        style={[styles.input, input.multiline && styles.multiline, !!message && styles.inputError]}
        value={value}
        onChangeText={(next) => {
          setBlurError(null);
          onChangeText(next);
        }}
        onFocus={() => setEngaged(true)}
        onBlur={() => {
          setEngaged(false);
          setBlurError(validate?.(value) ?? null);
        }}
      />
      <FieldError message={message} />
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = fromIsoDate(value);

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.field, styles.dateRow]}>
        <Label text={label} />
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          accentColor={colors.amber}
          themeVariant="dark"
          onValueChange={(_event, next) => onChange(toIsoDate(next))}
        />
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Label text={label} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDate(value)}`}
        style={styles.input}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.inputText}>{formatDate(value)}</Text>
      </Pressable>
      {open && Platform.OS === "android" && (
        <DateTimePicker
          value={date}
          mode="date"
          onValueChange={(_event, next) => {
            setOpen(false);
            onChange(toIsoDate(next));
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}

export type Option = { value: string; label: string };

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose one",
  error,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.field}>
      <Label text={label} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? "not chosen"}`}
        style={[styles.input, styles.selectRow, !!error && styles.inputError]}
        onPress={() => setOpen(true)}
      >
        <Text style={current ? styles.inputText : styles.placeholder}>
          {current?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.steel} />
      </Pressable>
      <FieldError message={error} />

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetColumn}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.value === value }}
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.inputText}>{item.label}</Text>
                  {item.value === value && (
                    <Feather name="check" size={20} color={colors.amber} />
                  )}
                </Pressable>
              )}
            />
            <Button label="Cancel" kind="secondary" onPress={() => setOpen(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { color: colors.label, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.fieldEdge,
    borderRadius: 8,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    color: colors.chalk,
    fontFamily: fonts.regular,
    fontSize: 16,
    justifyContent: "center",
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  inputError: { borderColor: colors.overdue },
  inputText: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 16 },
  placeholder: { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 16 },
  error: { color: colors.overdue, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheet: { flex: 1, backgroundColor: colors.asphalt },
  sheetColumn: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_WIDTH,
    alignSelf: "center",
    padding: space.lg,
    gap: space.md,
  },
  sheetTitle: { color: colors.chalk, fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
});
