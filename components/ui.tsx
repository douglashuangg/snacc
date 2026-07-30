import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { colors, radius, spacing } from "@/constants/theme";
import type { Category, PriceLevel, Rating, Snack } from "@/types/models";

export function Screen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Heading({
  children,
  action,
}: PropsWithChildren<{ action?: ReactNode }>) {
  return (
    <View style={styles.headingRow}>
      <Text style={styles.heading}>{children}</Text>
      {action}
    </View>
  );
}

export function Button({
  children,
  onPress,
  disabled,
  variant = "primary",
  icon,
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (pressed || disabled) && styles.buttonDimmed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={variant === "secondary" ? colors.ink : colors.surface}
        />
      ) : null}
      <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, error && styles.inputError]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function PriceLevelView({ level }: { level: PriceLevel }) {
  return <Text style={styles.price}>{"$".repeat(level)}</Text>;
}

export function CategoryChips({
  categories,
  selected = [],
  onToggle,
}: {
  categories: Category[];
  selected?: string[];
  onToggle?: (id: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {categories.map((category) => {
        const active = selected.includes(category.id);
        return (
          <Pressable
            key={category.id}
            disabled={!onToggle}
            onPress={() => onToggle?.(category.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScoreBadge({ score }: { score?: number | null }) {
  return (
    <View style={styles.scoreBadge}>
      <Text style={styles.score}>{score ? score.toFixed(1) : "New"}</Text>
    </View>
  );
}

export function SnackCard({ snack }: { snack: Snack }) {
  const brand = snack.maker_name || snack.brand;
  const title = snack.name_ja || snack.product_name;
  const genreHint = snack.rakuten_genres?.[0]?.name_ja;
  return (
    <Link href={`/snack/${snack.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.buttonDimmed]}>
        <Image
          source={snack.image_url || undefined}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.eyebrow}>{brand}</Text>
            <ScoreBadge score={snack.average_score} />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.flavour} numberOfLines={1}>
            {genreHint || snack.flavour}
          </Text>
          <View style={styles.metaRow}>
            <PriceLevelView level={snack.price_level} />
            <Text style={styles.muted}>
              {snack.rating_count ?? 0} rating{snack.rating_count === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const factorLabels: Record<string, string> = {
  taste: "Taste",
  texture: "Texture",
  value: "Value",
  packaging: "Packaging",
  buy_again: "Buy again",
};

export function RatingBreakdown({ snack }: { snack: Snack }) {
  if (!snack.factor_averages) return <EmptyState title="No ratings yet" message="Be the first to score it." />;
  return (
    <View style={styles.breakdown}>
      {Object.entries(snack.factor_averages).map(([key, value]) => (
        <View key={key} style={styles.factorRow}>
          <Text style={styles.factorLabel}>{factorLabels[key]}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Number(value) * 10}%` }]} />
          </View>
          <Text style={styles.factorScore}>{Number(value).toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

export function ReviewCard({ rating }: { rating: Rating }) {
  return (
    <View style={styles.review}>
      <View style={styles.cardTop}>
        <Text style={styles.label}>{rating.profiles?.username || "Snack fan"}</Text>
        <ScoreBadge score={rating.overall_score} />
      </View>
      <Text style={styles.reviewText}>{rating.review_text}</Text>
      <Text style={styles.muted}>{new Date(rating.updated_at).toLocaleDateString()}</Text>
    </View>
  );
}

export function LoadingState({ label = "Loading snacks…" }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      <Ionicons name="fast-food-outline" size={36} color={colors.primary} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action}
    </View>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      message={message}
      action={retry ? <Button onPress={retry}>Try again</Button> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenContent: { padding: spacing.md, paddingBottom: 80, gap: spacing.md },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { color: colors.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  eyebrow: { color: colors.primaryDark, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  button: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDimmed: { opacity: 0.55 },
  buttonText: { color: colors.surface, fontWeight: "800", fontSize: 16 },
  buttonTextSecondary: { color: colors.ink },
  field: { gap: spacing.xs },
  label: { color: colors.ink, fontWeight: "700" },
  input: {
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 16,
  },
  multiline: { minHeight: 112, paddingTop: spacing.md, textAlignVertical: "top" },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13 },
  price: { color: colors.success, fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { backgroundColor: colors.chip, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipActive: { backgroundColor: colors.ink },
  chipText: { color: colors.ink, fontWeight: "700" },
  chipTextActive: { color: colors.surface },
  scoreBadge: {
    minWidth: 44,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { color: colors.ink, fontWeight: "900" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
  },
  cardImage: { width: 112, minHeight: 132, backgroundColor: colors.chip },
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.xs },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  flavour: { color: colors.muted, fontSize: 15 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: "auto" },
  muted: { color: colors.muted, fontSize: 13 },
  breakdown: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: 12 },
  factorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  factorLabel: { width: 78, color: colors.ink, fontWeight: "600" },
  track: { flex: 1, height: 8, backgroundColor: colors.chip, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  factorScore: { width: 28, color: colors.ink, fontWeight: "800", textAlign: "right" },
  review: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewText: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  state: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  stateTitle: { color: colors.ink, fontWeight: "800", fontSize: 18, textAlign: "center" },
  stateMessage: { color: colors.muted, lineHeight: 20, textAlign: "center" },
});
