import { Feather } from "@expo/vector-icons";
import type { CarPart, ScannedPart } from "@revlog/api";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { colors, fonts, radius, space } from "@/lib/theme";

// One row of the list the server reads. `id` marks a part that's already saved.
export type PartValues = {
  key: string;
  id?: string;
  name: string;
  url: string;
  quantity: string;
  price: string;
  trackPrice: boolean;
  lowestPrice?: number | null;
  priceError?: string | null;
};

let nextKey = 0;

export const blankPart = (): PartValues => ({
  key: `new-${nextKey++}`,
  name: "",
  url: "",
  quantity: "1",
  price: "",
  trackPrice: false,
});

export const scannedPart = (part: ScannedPart): PartValues => ({
  ...blankPart(),
  ...part,
  quantity: part.quantity || "1",
});

export const toPartValues = (part: CarPart): PartValues => ({
  key: part.id,
  id: part.id,
  name: part.name,
  url: part.url ?? "",
  quantity: String(part.quantity),
  price: part.price ?? "",
  trackPrice: part.trackPrice,
  lowestPrice: part.lowestPrice,
  priceError: part.priceError,
});

export const partsPayload = (parts: PartValues[]) =>
  JSON.stringify(
    parts.map(({ id, name, url, quantity, price, trackPrice }) => ({
      id,
      name,
      url,
      quantity,
      price,
      trackPrice,
    })),
  );

export function PartsEditor({
  label,
  parts,
  onChange,
}: {
  label: string;
  parts: PartValues[];
  onChange: (parts: PartValues[]) => void;
}) {
  const update = (key: string, change: Partial<PartValues>) =>
    onChange(parts.map((p) => (p.key === key ? { ...p, ...change } : p)));

  return (
    <View style={styles.editor}>
      <Text style={styles.heading}>{label}</Text>
      {parts.map((part, i) => (
        <View key={part.key} style={styles.part}>
          <View style={styles.partHead}>
            <Text style={styles.partNumber}>Part {i + 1}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${part.name || `part ${i + 1}`}`}
              hitSlop={8}
              style={styles.remove}
              onPress={() => onChange(parts.filter((p) => p.key !== part.key))}
            >
              <Feather name="x" size={20} color={colors.steel} />
            </Pressable>
          </View>
          <Field
            label="Name"
            value={part.name}
            onChangeText={(name) => update(part.key, { name })}
            maxLength={120}
          />
          <View style={styles.pair}>
            <View style={styles.pairItem}>
              <Field
                label="Quantity"
                value={part.quantity}
                onChangeText={(quantity) => update(part.key, { quantity })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.pairItem}>
              <Field
                label="Price"
                value={part.price}
                onChangeText={(price) => update(part.key, { price })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Field
            label="Link (optional)"
            value={part.url}
            onChangeText={(url) => update(part.key, { url })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={2000}
          />
          <View style={styles.track}>
            <Text style={styles.trackLabel}>Track price</Text>
            <Switch
              accessibilityLabel="Track this part's price"
              value={part.trackPrice}
              trackColor={{ true: colors.amber, false: colors.graphite }}
              onValueChange={(trackPrice) => update(part.key, { trackPrice })}
            />
          </View>
          {part.lowestPrice != null && (
            <Text style={styles.hint}>
              Lowest seen {formatMoney(String(part.lowestPrice))}
            </Text>
          )}
          {part.priceError && <Text style={styles.hint}>{part.priceError}</Text>}
        </View>
      ))}
      <Button label="Add a part" kind="secondary" onPress={() => onChange([...parts, blankPart()])} />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: space.md },
  heading: { color: colors.label, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  part: { gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.panel },
  partHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  partNumber: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 16 },
  remove: { minWidth: 32, minHeight: 32, alignItems: "flex-end", justifyContent: "center" },
  pair: { flexDirection: "row", gap: space.md },
  pairItem: { flex: 1 },
  track: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  trackLabel: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 16 },
  hint: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
