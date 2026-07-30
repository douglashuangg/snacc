import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

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

function formatJpyRange(min?: number | null, max?: number | null, average?: number | null) {
  const formatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });
  if (min != null && max != null && min !== max) return `${formatter.format(min)}–${formatter.format(max)}`;
  if (min != null) return formatter.format(min);
  if (max != null) return formatter.format(max);
  if (average != null) return `Avg. ${formatter.format(average)}`;
  return null;
}

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
  const rakutenPrice = formatJpyRange(
    item.price_min_jpy,
    item.price_max_jpy,
    item.price_average_jpy,
  );
  const isRakuten = item.source_type === "rakuten";
  const displayBrand = item.maker_name || item.brand;
  const displayTitle = item.name_ja || item.product_name;
  const genreCategories = (item.rakuten_genres ?? []).map((genre) => ({
    id: genre.genre_id,
    name: genre.name_ja,
    slug: genre.genre_id,
  }));

  return (
    <Screen>
      <Image source={item.image_url || undefined} style={styles.hero} contentFit="cover" transition={200} />
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>{displayBrand}</Text>
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.flavour}>{item.flavour}</Text>
        </View>
        <ScoreBadge score={item.average_score} />
      </View>
      <View style={styles.meta}>
        <PriceLevelView level={item.price_level} />
        <Text style={styles.metaText}>{item.subcategories?.name ?? "Snack"}</Text>
        <Text style={styles.metaText}>{item.rating_count ?? 0} ratings</Text>
      </View>
      <CategoryChips categories={item.categories?.length ? item.categories : genreCategories} />
      {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
      {isRakuten ? (
        <View style={styles.rakutenCard}>
          <Text style={styles.rakutenHeading}>Rakuten product information</Text>
          {item.name_ja && item.name_ja !== item.product_name ? (
            <Text style={styles.description}>{item.name_ja}</Text>
          ) : null}
          {item.maker_name ? (
            <Text style={styles.metaText}>Maker: {item.maker_name}</Text>
          ) : null}
          {genreCategories.length ? (
            <Text style={styles.metaText}>
              Genre: {genreCategories.map((genre) => genre.name).join(" · ")}
            </Text>
          ) : null}
          {item.description_ja ? <Text style={styles.rakutenDescription}>{item.description_ja}</Text> : null}
          {rakutenPrice ? <Text style={styles.metaText}>Current price range: {rakutenPrice}</Text> : null}
          {item.rakuten_review_average != null ? (
            <Text style={styles.metaText}>
              Rakuten rating: {Number(item.rakuten_review_average).toFixed(1)}/5
              {item.rakuten_review_count != null ? ` (${item.rakuten_review_count} reviews)` : ""}
            </Text>
          ) : null}
          {item.package_size_text ? (
            <Text style={styles.metaText}>Package: {item.package_size_text}</Text>
          ) : null}
          {item.rakuten_product_url ? (
            <Pressable onPress={() => Linking.openURL(item.rakuten_product_url!)}>
              <Text style={styles.rakutenLink}>View product on Rakuten</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => Linking.openURL("https://developers.rakuten.com/")}>
            <Text style={styles.rakutenCredit}>Supported by Rakuten Developers</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        {!id.startsWith("sp-") ? <View style={{ flex: 1 }}><Button onPress={rate} icon="star">Rate it</Button></View> : null}
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

      {!id.startsWith("sp-") ? (
        <>
          <Heading>Reviews</Heading>
          {reviews.isLoading ? <LoadingState label="Loading reviews…" /> : null}
          {reviews.error ? <ErrorState message={reviews.error.message} retry={() => reviews.refetch()} /> : null}
          {!reviews.isLoading && !reviews.data?.length ? (
            <EmptyState title="No written reviews" message="Share the first detailed snack take." />
          ) : null}
          {reviews.data?.map((rating) => <ReviewCard key={rating.id} rating={rating} />)}

          <Button variant="secondary" icon="flag-outline" onPress={report}>Report content</Button>
        </>
      ) : null}
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
  rakutenCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  rakutenHeading: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  rakutenDescription: { color: colors.muted, lineHeight: 20 },
  rakutenLink: { color: colors.primaryDark, fontWeight: "800", textDecorationLine: "underline" },
  rakutenCredit: { color: colors.muted, fontSize: 12, textDecorationLine: "underline" },
  actions: { flexDirection: "row", gap: spacing.sm },
});
