import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScoreBadge,
} from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useSnacks } from "@/lib/queries";
import { useAuth } from "@/providers/AuthProvider";
import type { Snack } from "@/types/models";

export default function TriedSnackScreen() {
  const { user, configured } = useAuth();
  const [search, setSearch] = useState("");
  const snacks = useSnacks({ search, sort: "name" });

  if (!user) {
    return (
      <Screen>
        <View style={styles.gate}>
          <Text style={styles.title}>Log a snack you’ve tried</Text>
          <Text style={styles.copy}>
            Sign in to pick from the catalogue and leave a rating.
          </Text>
          {!configured ? (
            <Text style={styles.notice}>
              Connect Supabase in .env before creating an account.
            </Text>
          ) : null}
          <Button onPress={() => router.push("/sign-in")}>
            Sign in or create account
          </Button>

          <Button onPress={() => router.push("/sign-in")}>Sign in or create account</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>What have you tried?</Text>
      <Text style={styles.copy}>
        Pick a snack from the catalogue, then rate it.
      </Text>

      <TextInput
        accessibilityLabel="Search snacks"
        value={search}
        onChangeText={setSearch}
        placeholder="Search brand, product, or flavour"
        placeholderTextColor={colors.muted}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {snacks.isLoading ? <LoadingState label="Loading snacks…" /> : null}
      {snacks.error ? (
        <ErrorState
          message={snacks.error.message}
          retry={() => snacks.refetch()}
        />
      ) : null}
      {!snacks.isLoading && !snacks.error && !(snacks.data?.length ?? 0) ? (
        <EmptyState
          title="No matching snacks"
          message="Try another search, or browse the Discover tab."
        />
      ) : null}

      {snacks.data?.map((snack) => (
        <TriedSnackRow
          key={snack.id}
          snack={snack}
          onPress={() => router.push(`/snack/${snack.id}/rate`)}
        />
      ))}
    </Screen>
  );
}

function TriedSnackRow({
  snack,
  onPress,
}: {
  snack: Snack;
  onPress: () => void;
}) {
  const brand = snack.maker_name || snack.brand;
  const title = snack.name_ja || snack.product_name;
  const subtitle = snack.rakuten_genres?.[0]?.name_ja || snack.flavour;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Rate ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Image
        source={snack.image_url || undefined}
        style={styles.thumb}
        contentFit="cover"
      />
      <View style={styles.rowBody}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {brand}
        </Text>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ScoreBadge score={snack.average_score} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gate: { paddingTop: 80, gap: spacing.md },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  copy: { color: colors.muted, lineHeight: 21, marginBottom: spacing.sm },
  notice: {
    color: colors.primaryDark,
    backgroundColor: "#FFF1C7",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  search: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.sm,
  },
  rowPressed: { opacity: 0.85 },
  thumb: {
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    height: 64,
    width: 64,
  },
  rowBody: { flex: 1, gap: 2 },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  rowSubtitle: { color: colors.muted, fontSize: 14 },
});
