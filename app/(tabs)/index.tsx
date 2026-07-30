import { Link, router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  Button,
  CategoryChips,
  EmptyState,
  ErrorState,
  Heading,
  LoadingState,
  Screen,
  SnackCard,
} from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useSnacks, useTaxonomy } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function DiscoverScreen() {
  const snacks = useSnacks({ sort: "top" });
  const taxonomy = useTaxonomy();

  if (snacks.isLoading || taxonomy.isLoading) return <LoadingState />;
  if (snacks.error || taxonomy.error) {
    return (
      <ErrorState
        message={(snacks.error || taxonomy.error)?.message ?? "Unable to load snacks."}
        retry={() => {
          snacks.refetch();
          taxonomy.refetch();
        }}
      />
    );
  }

  const top = snacks.data?.slice(0, 3) ?? [];
  const recent = [...(snacks.data ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  return (
    <Screen>


      <Heading>Browse by taste</Heading>
      <CategoryChips
        categories={taxonomy.data?.categories.slice(0, 7) ?? []}
        onToggle={() => router.push("/browse")}
      />

      <Heading
        action={
          <Link href="/browse" style={styles.link}>
            See all
          </Link>
        }
      >
        Top rated
      </Heading>
      {top.length ? top.map((snack) => <SnackCard key={snack.id} snack={snack} />) : (
        <EmptyState title="No snacks yet" message="Add the first snack to get the rankings started." />
      )}

      <Heading>Recently added</Heading>
      {recent.map((snack) => <SnackCard key={snack.id} snack={snack} />)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  kicker: { color: colors.accent, fontWeight: "900", fontSize: 12, letterSpacing: 1.3 },
  title: { color: colors.surface, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: -1 },
  subtitle: { color: "#D8CEC7", fontSize: 16, lineHeight: 23 },
  demo: {
    backgroundColor: "#FFF1C7",
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  demoTitle: { color: colors.ink, fontWeight: "800" },
  demoText: { color: colors.muted, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: "800" },
});
