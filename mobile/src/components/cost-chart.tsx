import type { Costs } from "@revlog/api";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDollars } from "@/lib/format";
import { tapFeedback } from "@/lib/haptics";
import { colors, fonts, space } from "@/lib/theme";

type Month = Costs["months"][number];

const BAR_AREA = 168;
const MIN_SEGMENT = 3;

const describe = (m: Month) =>
  `${m.label} ${m.month.slice(0, 4)}: ${formatDollars(m.service)} service, ${formatDollars(m.mods)} mods`;

// Stacked monthly bars: service under mods, with a readout for the tapped month.
export function CostChart({ months }: { months: Month[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(...months.map((m) => m.service + m.mods), 1);
  const shown = active === null ? null : months[active];
  const height = (amount: number) =>
    amount > 0 ? Math.max((amount / max) * BAR_AREA, MIN_SEGMENT) : 0;

  return (
    <View style={styles.chart}>
      <View style={styles.legend} accessibilityElementsHidden>
        <View style={styles.key}>
          <View style={[styles.swatch, styles.service]} />
          <Text style={styles.small}>Service</Text>
        </View>
        <View style={styles.key}>
          <View style={[styles.swatch, styles.mods]} />
          <Text style={styles.small}>Mods</Text>
        </View>
      </View>
      <Text style={styles.readout} accessibilityLiveRegion="polite">
        {shown ? describe(shown) : "Tap a month for details"}
      </Text>

      <View style={styles.bars}>
        {months.map((m, i) => (
          <Pressable
            key={m.month}
            accessibilityRole="button"
            accessibilityLabel={describe(m)}
            accessibilityState={{ selected: active === i }}
            style={[styles.column, active === i && styles.columnActive]}
            onPress={() => {
              tapFeedback();
              setActive(active === i ? null : i);
            }}
          >
            {m.mods > 0 && <View style={[styles.segment, styles.mods, { height: height(m.mods) }]} />}
            {m.service > 0 && (
              <View style={[styles.segment, styles.service, { height: height(m.service) }]} />
            )}
          </Pressable>
        ))}
      </View>
      <View style={styles.labels} accessibilityElementsHidden>
        {months.map((m) => (
          <Text key={m.month} style={styles.label} numberOfLines={1}>
            {m.label.charAt(0)}
          </Text>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: table }}
        style={styles.tableToggle}
        onPress={() => setTable(!table)}
      >
        <Text style={styles.toggleLabel}>{table ? "Hide table" : "Show as a table"}</Text>
      </Pressable>
      {table &&
        months.map((m) => (
          <View key={m.month} style={styles.row}>
            <Text style={styles.rowMonth}>
              {m.label} {m.month.slice(0, 4)}
            </Text>
            <Text style={styles.rowValue}>{formatDollars(m.service + m.mods)}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: space.sm },
  legend: { flexDirection: "row", gap: space.lg },
  key: { flexDirection: "row", alignItems: "center", gap: space.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  small: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  readout: { color: colors.chalk, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bars: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
    height: BAR_AREA + space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  column: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  columnActive: { backgroundColor: colors.graphite },
  segment: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  service: { backgroundColor: colors.chartService },
  mods: { backgroundColor: colors.chartMods },
  labels: { flexDirection: "row", gap: 4 },
  label: {
    flex: 1,
    textAlign: "center",
    color: colors.steel,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  tableToggle: { minHeight: 44, justifyContent: "center" },
  toggleLabel: { color: colors.amber, fontFamily: fonts.medium, fontSize: 15 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.edge,
  },
  rowMonth: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  rowValue: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 14, lineHeight: 20 },
});
