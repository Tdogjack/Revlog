import type { Costs } from "@revlog/api";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CostChart } from "@/components/cost-chart";
import { Body, EmptyState, Heading, LoadFailed, Loading, Screen } from "@/components/ui";
import { formatDollars } from "@/lib/format";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function CostsScreen() {
  const { data, error, reload } = useApi<Costs>("/costs");

  if (!data) return error ? <LoadFailed message={error} onRetry={reload} /> : <Loading />;

  if (data.total === 0) {
    return (
      <Screen>
        <EmptyState
          title="Nothing to add up yet"
          body="Costs appear here as you log service and installed mods with a price."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
          {formatDollars(data.total)}
        </Text>
        <Body style={styles.muted}>Spent on service and installed mods, all time</Body>
      </View>

      <View style={styles.stats}>
        <Stat label="Last 12 months" value={formatDollars(data.lastYear)} />
        <Stat label="Service" value={formatDollars(data.serviceTotal)} />
        <Stat label="Mods" value={formatDollars(data.modsTotal)} />
      </View>

      <View style={styles.section}>
        <Heading>Spending by month</Heading>
        <CostChart months={data.months} />
      </View>

      <View style={styles.section}>
        <Heading>By car</Heading>
        <View style={styles.panel}>
          {data.perCar.map((car) => (
            <Pressable
              key={car.id}
              accessibilityRole="button"
              accessibilityLabel={`${car.name}, ${formatDollars(car.service + car.mods)}`}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/car/${car.id}`)}
            >
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle}>{car.name}</Text>
                <Text style={styles.rowAmount}>{formatDollars(car.service + car.mods)}</Text>
              </View>
              <Text style={styles.rowDetail}>
                {formatDollars(car.service)} service, {formatDollars(car.mods)} mods
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Heading>Biggest categories</Heading>
        <View style={styles.panel}>
          {data.topCategories.map((category) => (
            <View key={category.label} style={[styles.row, styles.rowHead]}>
              <Text style={styles.rowTitle}>{category.label}</Text>
              <Text style={styles.rowAmount}>{formatDollars(category.amount)}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.xs },
  total: { color: colors.amber, fontFamily: fonts.mono, fontSize: 44, lineHeight: 52 },
  muted: { color: colors.steel },
  stats: { flexDirection: "row", gap: space.sm },
  stat: {
    flex: 1,
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  statValue: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 16, lineHeight: 22 },
  statLabel: { color: colors.steel, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  section: { gap: space.md, marginTop: space.md },
  panel: { borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.panel },
  row: {
    gap: 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.edge,
  },
  rowPressed: { backgroundColor: colors.graphite },
  rowHead: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  rowTitle: {
    flexShrink: 1,
    color: colors.chalk,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  rowAmount: { color: colors.chalk, fontFamily: fonts.mono, fontSize: 15, lineHeight: 22 },
  rowDetail: { color: colors.steel, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
