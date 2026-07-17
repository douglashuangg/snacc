import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CategoryChips,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SnackCard,
} from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useSnacks, useTaxonomy } from "@/lib/queries";
import type { PriceLevel, SnackFilters } from "@/types/models";

const sortOptions = [
  ["top", "Top rated"],
  ["recent", "Newest"],
  ["name", "A–Z"],
] as const;

export default function BrowseScreen() {
  const [search, setSearch] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<string>();
  const [priceLevel, setPriceLevel] = useState<PriceLevel>();
  const [minimumScore, setMinimumScore] = useState<number>();
  const [sort, setSort] = useState<SnackFilters["sort"]>("top");
  const taxonomy = useTaxonomy();
  const snacks = useSnacks({ search, categoryIds, subcategoryId, priceLevel, minimumScore, sort });

  const toggleCategory = (id: string) =>
    setCategoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <Screen>
      <TextInput
        accessibilityLabel="Search snacks"
        value={search}
        onChangeText={setSearch}
        placeholder="Search brand, product, or flavour"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />

      <Text style={styles.label}>Taste</Text>
      <CategoryChips
        categories={taxonomy.data?.categories ?? []}
        selected={categoryIds}
        onToggle={toggleCategory}
      />

      <Text style={styles.label}>Subcategory</Text>
      <View style={styles.wrap}>
        <FilterChip label="All" active={!subcategoryId} onPress={() => setSubcategoryId(undefined)} />
        {taxonomy.data?.subcategories.map((item) => (
          <FilterChip
            key={item.id}
            label={item.name}
            active={subcategoryId === item.id}
            onPress={() => setSubcategoryId(item.id)}
          />
        ))}
      </View>

      <Text style={styles.label}>Price and score</Text>
      <View style={styles.wrap}>
        {[1, 2, 3].map((level) => (
          <FilterChip
            key={level}
            label={"$".repeat(level)}
            active={priceLevel === level}
            onPress={() => setPriceLevel(priceLevel === level ? undefined : (level as PriceLevel))}
          />
        ))}
        {[7, 8, 9].map((score) => (
          <FilterChip
            key={score}
            label={`${score}+ score`}
            active={minimumScore === score}
            onPress={() => setMinimumScore(minimumScore === score ? undefined : score)}
          />
        ))}
      </View>

      <View style={styles.sortRow}>
        {sortOptions.map(([value, label]) => (
          <FilterChip key={value} label={label} active={sort === value} onPress={() => setSort(value)} />
        ))}
      </View>

      {snacks.isLoading || taxonomy.isLoading ? <LoadingState /> : null}
      {snacks.error || taxonomy.error ? (
        <ErrorState
          message={(snacks.error || taxonomy.error)?.message ?? "Unable to browse snacks."}
          retry={() => {
            snacks.refetch();
            taxonomy.refetch();
          }}
        />
      ) : null}
      {!snacks.isLoading && !snacks.error && !snacks.data?.length ? (
        <EmptyState title="No matches" message="Try removing a filter or searching another flavour." />
      ) : null}
      {snacks.data?.map((snack) => <SnackCard key={snack.id} snack={snack} />)}
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 16,
  },
  label: { color: colors.ink, fontWeight: "900", fontSize: 16, marginTop: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sortRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  filter: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.ink, fontWeight: "700" },
  filterTextActive: { color: colors.surface },
});
