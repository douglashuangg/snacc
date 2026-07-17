import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  Button,
  CategoryChips,
  EmptyState,
  ErrorState,
  Heading,
  LoadingState,
  PriceLevelView,
  RatingBreakdown,
  ReviewCard,
  ScoreBadge,
  Screen,
} from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useCompareStore } from "@/lib/compare-store";
import { useReviews, useSnack } from "@/lib/queries";
import { requireSupabase, supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function SnackDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const snack = useSnack(id);
  const reviews = useReviews(id);
  const { user } = useAuth();
  const selected = useCompareStore((state) => state.snackIds.includes(id));
  const toggleSnack = useCompareStore((state) => state.toggleSnack);

  if (snack.isLoading) return <LoadingState label="Loading snack…" />;
  if (snack.error || !snack.data) {
    return <ErrorState message={snack.error?.message ?? "Snack not found."} retry={() => snack.refetch()} />;
  }
  const item = snack.data;

  const rate = () => {
    if (!user) {
      router.push({ pathname: "/sign-in", params: { returnTo: `/snack/${id}/rate` } });
      return;
    }
    router.push(`/snack/${id}/rate`);
  };

  const report = () => {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    Alert.alert("Report this snack", "What should moderators review?", [
      ...["Duplicate entry", "Incorrect information", "Inappropriate image"].map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            requireSupabase();
            const { error } = await supabase
              .from("reports")
              .insert({ reporter_id: user.id, snack_id: id, reason });
            if (error) throw error;
            Alert.alert("Report received", "Thanks for helping keep Snacc useful.");
          } catch (error) {
            Alert.alert("Could not report", error instanceof Error ? error.message : "Try again.");
          }
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Screen>
      <Image source={item.image_url || undefined} style={styles.hero} contentFit="cover" transition={200} />
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>{item.brand}</Text>
          <Text style={styles.title}>{item.product_name}</Text>
          <Text style={styles.flavour}>{item.flavour}</Text>
        </View>
        <ScoreBadge score={item.average_score} />
      </View>
      <View style={styles.meta}>
        <PriceLevelView level={item.price_level} />
        <Text style={styles.metaText}>{item.subcategories?.name ?? "Snack"}</Text>
        <Text style={styles.metaText}>{item.rating_count ?? 0} ratings</Text>
      </View>
      <CategoryChips categories={item.categories ?? []} />
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

      <View style={styles.actions}>
        <View style={{ flex: 1 }}><Button onPress={rate} icon="star">Rate it</Button></View>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            icon={selected ? "checkmark-circle" : "git-compare-outline"}
            onPress={() => {
              toggleSnack(id);
              if (!selected && useCompareStore.getState().snackIds.length === 2) router.push("/compare");
            }}
          >
            {selected ? "Selected" : "Compare"}
          </Button>
        </View>
      </View>

      <Heading>Community score</Heading>
      <RatingBreakdown snack={item} />

      <Heading>Reviews</Heading>
      {reviews.isLoading ? <LoadingState label="Loading reviews…" /> : null}
      {reviews.error ? <ErrorState message={reviews.error.message} retry={() => reviews.refetch()} /> : null}
      {!reviews.isLoading && !reviews.data?.length ? (
        <EmptyState title="No written reviews" message="Share the first detailed snack take." />
      ) : null}
      {reviews.data?.map((rating) => <ReviewCard key={rating.id} rating={rating} />)}

      <Button variant="secondary" icon="flag-outline" onPress={report}>Report content</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 280, borderRadius: radius.lg, backgroundColor: colors.chip },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  brand: { color: colors.primaryDark, fontWeight: "900", textTransform: "uppercase", fontSize: 13 },
  title: { color: colors.ink, fontSize: 28, fontWeight: "900", letterSpacing: -0.6 },
  flavour: { color: colors.muted, fontSize: 18, marginTop: spacing.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  metaText: { color: colors.muted, fontWeight: "600" },
  description: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: "row", gap: spacing.sm },
});
