import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, LoadingState, PriceLevelView, Screen, ScoreBadge } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useCompareStore } from "@/lib/compare-store";
import { useSnacks } from "@/lib/queries";
import type { Snack } from "@/types/models";

export default function CompareScreen() {
  const snacks = useSnacks({ sort: "top" });
  const snackIds = useCompareStore((state) => state.snackIds);
  const setSnack = useCompareStore((state) => state.setSnack);
  const selected = useMemo(
    () => snackIds.map((id) => snacks.data?.find((snack) => snack.id === id)).filter(Boolean) as Snack[],
    [snackIds, snacks.data],
  );

  if (snacks.isLoading) return <LoadingState />;

  return (
    <Screen>
      <Text style={styles.intro}>Pick two products to see how their community scores stack up.</Text>
      {([0, 1] as const).map((slot) => (
        <View key={slot} style={styles.selectorGroup}>
          <Text style={styles.label}>Snack {slot + 1}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
            {snacks.data?.map((snack) => (
              <Pressable
                key={snack.id}
                onPress={() => setSnack(slot, snack.id)}
                style={[styles.option, snackIds[slot] === snack.id && styles.optionActive]}
              >
                <Text style={[styles.optionBrand, snackIds[slot] === snack.id && styles.optionTextActive]}>
                  {snack.brand}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.optionFlavour, snackIds[slot] === snack.id && styles.optionTextActive]}
                >
                  {snack.flavour}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}

      {selected.length < 2 ? (
        <EmptyState title="Choose two snacks" message="Your side-by-side comparison will appear here." />
      ) : (
        <View style={styles.table}>
          <CompareHeader snacks={selected} />
          <CompareRow label="Overall" values={selected.map((item) => item.average_score?.toFixed(1) ?? "New")} />
          <CompareRow label="Taste" values={selected.map((item) => item.factor_averages?.taste.toFixed(1) ?? "—")} />
          <CompareRow label="Texture" values={selected.map((item) => item.factor_averages?.texture.toFixed(1) ?? "—")} />
          <CompareRow label="Value" values={selected.map((item) => item.factor_averages?.value.toFixed(1) ?? "—")} />
          <CompareRow label="Packaging" values={selected.map((item) => item.factor_averages?.packaging.toFixed(1) ?? "—")} />
          <CompareRow label="Buy again" values={selected.map((item) => item.factor_averages?.buy_again.toFixed(1) ?? "—")} />
          <CompareRow label="Price" values={selected.map((item) => "$".repeat(item.price_level))} />
          <CompareRow label="Ratings" values={selected.map((item) => String(item.rating_count ?? 0))} />
          <CompareRow label="Tastes" values={selected.map((item) => item.categories?.map((tag) => tag.name).join(", ") || "—")} />
        </View>
      )}
    </Screen>
  );
}

function CompareHeader({ snacks }: { snacks: Snack[] }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>Product</Text>
      {snacks.map((snack) => (
        <View key={snack.id} style={styles.cell}>
          <Text style={styles.headerBrand}>{snack.brand}</Text>
          <Text style={styles.headerFlavour}>{snack.flavour}</Text>
          <ScoreBadge score={snack.average_score} />
          <PriceLevelView level={snack.price_level} />
        </View>
      ))}
    </View>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {values.map((value, index) => (
        <Text key={`${label}-${index}`} style={styles.cellText}>{value}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  selectorGroup: { gap: spacing.sm },
  label: { color: colors.ink, fontWeight: "900" },
  options: { gap: spacing.sm },
  option: {
    width: 150,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  optionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionBrand: { color: colors.primaryDark, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  optionFlavour: { color: colors.ink, fontWeight: "700" },
  optionTextActive: { color: colors.surface },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 58 },
  rowLabel: {
    width: 84,
    padding: spacing.sm,
    color: colors.muted,
    backgroundColor: colors.chip,
    fontWeight: "700",
    textAlignVertical: "center",
  },
  cell: { flex: 1, padding: spacing.sm, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  cellText: { flex: 1, padding: spacing.sm, color: colors.ink, textAlign: "center", textAlignVertical: "center" },
  headerBrand: { color: colors.primaryDark, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  headerFlavour: { color: colors.ink, fontWeight: "800", textAlign: "center" },
});
