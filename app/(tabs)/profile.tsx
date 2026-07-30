import { useQuery } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button, EmptyState, Heading, LoadingState, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileScreen() {
  const { user, loading, signOut, configured } = useAuth();
  const activity = useQuery({
    queryKey: ["profile-activity", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const ratings = await supabase
        .from("ratings")
        .select(
          "id, overall_score, review_text, updated_at, snacks(id, brand, product_name, flavour, name_ja, maker_name)",
        )
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (ratings.error) throw ratings.error;
      return { ratings: ratings.data };
    },
  });

  if (loading) return <LoadingState label="Loading profile…" />;
  if (!user) {
    return (
      <Screen>
        <View style={styles.gate}>
          <Text style={styles.title}>Keep track of your snack takes.</Text>
          <Text style={styles.copy}>
            Create an account to rate snacks you’ve tried from the catalogue.
          </Text>
          {!configured ? (
            <Text style={styles.notice}>Supabase credentials are required for accounts.</Text>
          ) : null}
          <Button onPress={() => router.push("/sign-in")}>Sign in or sign up</Button>
          <Text style={styles.copy}>Create an account to rate, review, and add snacks.</Text>

          <Button onPress={() => router.push("/sign-in")}>Sign in or create account</Button>
        </View>
      </Screen>
    );
  }

  const ratings = activity.data?.ratings ?? [];
  return (
    <Screen>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() ?? "S"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.copy}>
            Snack member since {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Button
        variant="secondary"
        onPress={async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert(
              "Could not sign out",
              error instanceof Error ? error.message : "Try again.",
            );
          }
        }}
      >
        Sign out
      </Button>

      <Heading>Snacks you’ve tried</Heading>
      {activity.isLoading ? <LoadingState /> : null}
      {!activity.isLoading && !ratings.length ? (
        <EmptyState
          title="No ratings yet"
          message="Use the Tried tab to pick a snack from the catalogue and rate it."
        />
      ) : null}
      {ratings.map((rating: any) => {
        const snack = rating.snacks;
        const title =
          snack?.name_ja ||
          `${snack?.brand ?? ""} ${snack?.flavour ?? ""}`.trim() ||
          "Snack";
        return (
          <Link key={rating.id} href={`/snack/${snack.id}`} style={styles.activity}>
            <Text style={styles.activityTitle}>{title}</Text>
            <Text style={styles.score}>{Number(rating.overall_score).toFixed(1)}</Text>
          </Link>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gate: { paddingTop: 80, gap: spacing.md },
  title: { color: colors.ink, fontSize: 32, fontWeight: "900", letterSpacing: -0.8 },
  copy: { color: colors.muted, lineHeight: 21 },
  notice: {
    color: colors.primaryDark,
    backgroundColor: "#FFF1C7",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  email: { color: colors.ink, fontWeight: "800", fontSize: 17 },
  activity: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
  },
  activityTitle: { color: colors.ink, fontWeight: "800" },
  score: { color: colors.primary, fontWeight: "900" },
});
