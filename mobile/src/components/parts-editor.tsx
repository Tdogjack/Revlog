import { Feather } from "@expo/vector-icons";
import type { CarDetail, CarPart, PriceCheck, ScannedPart } from "@revlog/api";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Field } from "@/components/fields";
import { Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDay, formatMoney } from "@/lib/format";
import { tapFeedback } from "@/lib/haptics";
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
  firstPrice?: number | null;
  lowestPrice?: number | null;
  lastCheckedAt?: string | null;
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
  firstPrice: part.firstPrice,
  lowestPrice: part.lowestPrice,
  lastCheckedAt: part.lastCheckedAt,
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

const isLink = (url: string) => /^https?:\/\/\S+$/i.test(url.trim());

// How the price has moved since the part was added, like "Down $5.00 since added".
function trend(part: PartValues) {
  const price = Number(part.price);
  if (!part.price || part.firstPrice == null || price === part.firstPrice) return null;
  const diff = price - part.firstPrice;
  return {
    down: diff < 0,
    text: `${diff < 0 ? "Down" : "Up"} ${formatMoney(String(Math.abs(diff)))} since added`,
  };
}

function LinkButton({
  icon,
  label,
  busy = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
      onPress={
        busy
          ? undefined
          : () => {
              tapFeedback();
              onPress();
            }
      }
    >
      {busy ? (
        <ActivityIndicator color={colors.amber} />
      ) : (
        <Feather name={icon} size={16} color={colors.amber} />
      )}
      <Text style={styles.linkLabel}>{label}</Text>
    </Pressable>
  );
}

export function PartsEditor({
  label,
  parts,
  onChange,
  carId,
}: {
  label: string;
  parts: PartValues[];
  onChange: (parts: PartValues[]) => void;
  // With a car, saved parts can have their price checked right away.
  carId?: string;
}) {
  const [checking, setChecking] = useState<string | null>(null);
  const update = (key: string, change: Partial<PartValues>) =>
    onChange(parts.map((p) => (p.key === key ? { ...p, ...change } : p)));

  // Reads the price from the part's link now, then shows what the server saved.
  const checkPrice = async (part: PartValues) => {
    setChecking(part.key);
    try {
      const { error } = await api<PriceCheck>(`/vehicles/${carId}/parts/${part.id}/price`, {
        method: "POST",
        body: {},
      });
      const car = await api<CarDetail>(`/vehicles/${carId}`);
      const fresh = [...car.records, ...car.mods]
        .flatMap((owner) => owner.parts)
        .find((p) => p.id === part.id);
      update(part.key, {
        ...(fresh && {
          price: fresh.price ?? "",
          firstPrice: fresh.firstPrice,
          lowestPrice: fresh.lowestPrice,
          lastCheckedAt: fresh.lastCheckedAt,
        }),
        priceError: error,
      });
    } catch (err) {
      update(part.key, { priceError: errorMessage(err) });
    } finally {
      setChecking(null);
    }
  };

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
          <Text style={styles.hint}>
            {part.trackPrice
              ? "Revlog checks the link each day and keeps the price up to date."
              : "Turn on to follow the price from the link."}
          </Text>
          {(() => {
            const moved = trend(part);
            const facts = [
              part.lowestPrice != null &&
                Number(part.price) !== part.lowestPrice &&
                `Lowest seen ${formatMoney(String(part.lowestPrice))}`,
              part.lastCheckedAt && `Checked ${formatDay(part.lastCheckedAt)}`,
            ].filter(Boolean);
            return (
              <>
                {moved && (
                  <Text style={[styles.trend, moved.down ? styles.trendDown : styles.trendUp]}>
                    {moved.text}
                  </Text>
                )}
                {facts.length > 0 && <Text style={styles.hint}>{facts.join(", ")}</Text>}
              </>
            );
          })()}
          {part.priceError && <Text style={styles.priceError}>{part.priceError}</Text>}
          {isLink(part.url) && (
            <View style={styles.links}>
              <LinkButton
                icon="external-link"
                label="Open link"
                onPress={() => WebBrowser.openBrowserAsync(part.url.trim())}
              />
              {carId && part.id && (
                <LinkButton
                  icon="refresh-cw"
                  label="Check price now"
                  busy={checking === part.key}
                  onPress={() => checkPrice(part)}
                />
              )}
            </View>
          )}
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
  trend: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  trendDown: { color: colors.done },
  trendUp: { color: colors.due },
  priceError: { color: colors.overdue, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  linkButtonPressed: { backgroundColor: colors.graphite },
  linkLabel: { color: colors.chalk, fontFamily: fonts.medium, fontSize: 15 },
});
