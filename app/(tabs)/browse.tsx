import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from "react-native";

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
import { useSpoonacularSearch } from "@/lib/spoonacular";
import type { PriceLevel, SnackFilters } from "@/types/models";

const sortOptions = [
  ["top", "Top rated"],
  ["recent", "Newest"],
  ["name", "A–Z"],
] as const;

export default function BrowseScreen() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"community" | "sp">("community");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<string>();
  const [priceLevel, setPriceLevel] = useState<PriceLevel>();
  const [minimumScore, setMinimumScore] = useState<number>();
  const [sort, setSort] = useState<SnackFilters["sort"]>("top");
  const [activeFilter, setActiveFilter] = useState<"taste" | "subcategory" | "price" | "sort" | null>(null);
  
  const taxonomy = useTaxonomy();
  const snacks = useSnacks({ search, categoryIds, subcategoryId, priceLevel, minimumScore, sort });
  const spSnacks = useSpoonacularSearch(search);

  const toggleCategory = (id: string) =>
    setCategoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <Screen>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search snacks"
          value={search}
          onChangeText={setSearch}
          placeholder={source === "community" ? "Search brand, product, or flavour" : "Search global database..."}
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <Pressable
          style={styles.cameraButton}
          onPress={async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission needed", "Please allow camera access in your device settings.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            });
            if (!result.canceled) {
              // TODO: process the captured image for snack identification
              Alert.alert("Photo captured!", "Snack identification coming soon.");
            }
          }}
        >
          <Ionicons name="camera-outline" size={24} color={colors.ink} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md }}>
        <FilterChip label="Community" active={source === "community"} onPress={() => setSource("community")} />
        <FilterChip label="Global Database" active={source === "sp"} onPress={() => setSource("sp")} />
      </View>

      {source === "community" ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.taskBar} contentContainerStyle={styles.taskBarContent}>
            <FilterChip 
              label={`Taste${categoryIds.length > 0 ? ` (${categoryIds.length})` : ""}`}
              active={activeFilter === "taste" || categoryIds.length > 0} 
              onPress={() => setActiveFilter(activeFilter === "taste" ? null : "taste")} 
            />
            <FilterChip 
              label={`Subcategory${subcategoryId ? " (1)" : ""}`} 
              active={activeFilter === "subcategory" || !!subcategoryId} 
              onPress={() => setActiveFilter(activeFilter === "subcategory" ? null : "subcategory")} 
            />
            <FilterChip 
              label={`Price & Score${(priceLevel ? 1 : 0) + (minimumScore ? 1 : 0) > 0 ? ` (${(priceLevel ? 1 : 0) + (minimumScore ? 1 : 0)})` : ""}`} 
              active={activeFilter === "price" || !!priceLevel || !!minimumScore} 
              onPress={() => setActiveFilter(activeFilter === "price" ? null : "price")} 
            />
            <FilterChip 
              label="Sort" 
              active={activeFilter === "sort"} 
              onPress={() => setActiveFilter(activeFilter === "sort" ? null : "sort")} 
            />
          </ScrollView>

          {activeFilter === "taste" && (
            <View style={styles.filterOptionsContainer}>
              <Text style={styles.label}>Taste</Text>
              <CategoryChips
                categories={taxonomy.data?.categories ?? []}
                selected={categoryIds}
                onToggle={toggleCategory}
              />
            </View>
          )}

          {activeFilter === "subcategory" && (
            <View style={styles.filterOptionsContainer}>
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
            </View>
          )}

          {activeFilter === "price" && (
            <View style={styles.filterOptionsContainer}>
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
            </View>
          )}

          {activeFilter === "sort" && (
            <View style={styles.filterOptionsContainer}>
              <View style={styles.sortRow}>
                {sortOptions.map(([value, label]) => (
                  <FilterChip key={value} label={label} active={sort === value} onPress={() => setSort(value as any)} />
                ))}
              </View>
            </View>
          )}

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
        </>
      ) : (
        <>
          {search.length <= 2 ? (
            <EmptyState title="Search Global Snacks" message="Type at least 3 characters to search Spoonacular." />
          ) : null}
          {spSnacks.isLoading && search.length > 2 ? <LoadingState label="Searching Spoonacular..." /> : null}
          {spSnacks.error ? (
            <ErrorState
              message={spSnacks.error?.message ?? "Unable to search Spoonacular."}
              retry={() => spSnacks.refetch()}
            />
          ) : null}
          {!spSnacks.isLoading && !spSnacks.error && spSnacks.data?.length === 0 && search.length > 2 ? (
            <EmptyState title="No matches" message="Try different keywords." />
          ) : null}
          {spSnacks.data?.map((snack) => <SnackCard key={snack.id} snack={snack} />)}
        </>
      )}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 16,
  },
  cameraButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  taskBar: { flexGrow: 0, marginBottom: spacing.md },
  taskBarContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  filterOptionsContainer: { marginBottom: spacing.md, padding: spacing.sm, backgroundColor: colors.chip, borderRadius: radius.md },
  label: { color: colors.ink, fontWeight: "900", fontSize: 16, marginTop: spacing.sm, marginBottom: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sortRow: {
    flexDirection: "row",
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
