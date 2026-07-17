import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button, LoadingState, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { useDeleteRating, useMyRating, useSaveRating, useSnack } from "@/lib/queries";
import { calculateOverallScore } from "@/lib/scoring";
import { useAuth } from "@/providers/AuthProvider";
import type { RatingInput } from "@/types/models";

const factors: [keyof Omit<RatingInput, "review_text">, string][] = [
  ["taste", "Taste"],
  ["texture", "Texture"],
  ["value", "Value"],
  ["packaging", "Packaging"],
  ["buy_again", "Would buy again"],
];

const initial: RatingInput = {
  taste: 5,
  texture: 5,
  value: 5,
  packaging: 5,
  buy_again: 5,
  review_text: "",
};

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const snack = useSnack(id);
  const existing = useMyRating(id, user?.id);
  const save = useSaveRating(id, user?.id);
  const remove = useDeleteRating(id, user?.id);
  const [values, setValues] = useState<RatingInput>(initial);
  const overall = useMemo(() => calculateOverallScore(values), [values]);

  useEffect(() => {
    if (existing.data) {
      // The query result hydrates this local, editable draft once it arrives.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues({
        taste: existing.data.taste,
        texture: existing.data.texture,
        value: existing.data.value,
        packaging: existing.data.packaging,
        buy_again: existing.data.buy_again,
        review_text: existing.data.review_text ?? "",
      });
    }
  }, [existing.data]);

  if (!user) {
    router.replace({ pathname: "/sign-in", params: { returnTo: `/snack/${id}/rate` } });
    return null;
  }
  if (snack.isLoading || existing.isLoading) return <LoadingState label="Preparing your rating…" />;

  const submit = async () => {
    try {
      await save.mutateAsync(values);
      router.back();
    } catch (error) {
      Alert.alert("Could not save rating", error instanceof Error ? error.message : "Try again.");
    }
  };

  const deleteRating = () =>
    Alert.alert("Delete your rating?", "This also removes your written review.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync();
            router.back();
          } catch (error) {
            Alert.alert("Could not delete rating", error instanceof Error ? error.message : "Try again.");
          }
        },
      },
    ]);

  return (
    <Screen>
      <Text style={styles.kicker}>{snack.data?.brand}</Text>
      <Text style={styles.title}>{snack.data?.flavour}</Text>
      <View style={styles.overall}>
        <Text style={styles.overallLabel}>YOUR OVERALL SCORE</Text>
        <Text style={styles.overallScore}>{overall.toFixed(1)}</Text>
        <Text style={styles.hint}>Weighted toward taste, texture, and value.</Text>
      </View>

      {factors.map(([key, label]) => (
        <View key={key} style={styles.factor}>
          <View style={styles.factorHeader}>
            <Text style={styles.factorLabel}>{label}</Text>
            <Text style={styles.value}>{values[key]}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.numbers}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
              <Pressable
                key={number}
                accessibilityLabel={`${label} ${number} out of 10`}
                onPress={() => setValues((current) => ({ ...current, [key]: number }))}
                style={[styles.number, values[key] === number && styles.numberActive]}
              >
                <Text style={[styles.numberText, values[key] === number && styles.numberTextActive]}>
                  {number}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}

      <Text style={styles.factorLabel}>Review (optional)</Text>
      <TextInput
        value={values.review_text}
        onChangeText={(review_text) => setValues((current) => ({ ...current, review_text }))}
        placeholder="What stood out? Keep it useful and kind."
        placeholderTextColor={colors.muted}
        maxLength={500}
        multiline
        style={styles.review}
      />
      <Text style={styles.count}>{values.review_text?.length ?? 0}/500</Text>

      <Button onPress={submit} disabled={save.isPending}>
        {save.isPending ? "Saving…" : existing.data ? "Update rating" : "Publish rating"}
      </Button>
      {existing.data ? (
        <Button variant="danger" onPress={deleteRating} disabled={remove.isPending}>Delete my rating</Button>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primaryDark, fontWeight: "900", textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  overall: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  overallLabel: { color: colors.accent, fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  overallScore: { color: colors.surface, fontSize: 58, lineHeight: 64, fontWeight: "900" },
  hint: { color: "#D8CEC7" },
  factor: { gap: spacing.sm },
  factorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factorLabel: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  value: { color: colors.primary, fontSize: 18, fontWeight: "900" },
  numbers: { gap: spacing.sm },
  number: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  numberActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  numberText: { color: colors.ink, fontWeight: "800" },
  numberTextActive: { color: colors.surface },
  review: {
    minHeight: 130,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
    textAlignVertical: "top",
    fontSize: 16,
  },
  count: { color: colors.muted, textAlign: "right", marginTop: -spacing.sm },
});
