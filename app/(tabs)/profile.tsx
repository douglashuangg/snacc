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
      const [ratings, snacks] = await Promise.all([
        supabase
          .from("ratings")
          .select("id, overall_score, review_text, updated_at, snacks(id, brand, product_name, flavour)")
          .eq("user_id", user!.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("snacks")
          .select("id, brand, product_name, flavour, status, source_type, created_at")
          .eq("created_by", user!.id)
          .eq("source_type", "community")
          .order("created_at", { ascending: false }),
      ]);
      if (ratings.error) throw ratings.error;
      if (snacks.error) throw snacks.error;
      return { ratings: ratings.data, snacks: snacks.data };
    },
  });

  if (loading) return <LoadingState label="Loading profile…" />;
  if (!user) {
    return (
      <Screen>
        <View style={styles.gate}>
          <Text style={styles.title}>Keep track of your snack takes.</Text>
          <Text style={styles.copy}>Create an account to rate, review, and add snacks.</Text>

          <Button onPress={() => router.push("/sign-in")}>Sign in or create account</Button>
        </View>
      </Screen>
    );
  }

  const ratings = activity.data?.ratings ?? [];
  const snacks = activity.data?.snacks ?? [];
  return (
    <Screen>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() ?? "S"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.copy}>Snack member since {new Date(user.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      <Button
        variant="secondary"
        onPress={async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Could not sign out", error instanceof Error ? error.message : "Try again.");
          }
        }}
      >
        Sign out
      </Button>

      <Heading>Your ratings</Heading>
      {activity.isLoading ? <LoadingState /> : null}
      {!activity.isLoading && !ratings.length ? (
        <EmptyState title="No ratings yet" message="Your snack reviews will appear here." />
      ) : null}
      {ratings.map((rating: any) => (
        <Link key={rating.id} href={`/snack/${rating.snacks.id}`} style={styles.activity}>
          <Text style={styles.activityTitle}>
            {rating.snacks.brand} {rating.snacks.flavour}
          </Text>
          <Text style={styles.score}>{Number(rating.overall_score).toFixed(1)}</Text>
        </Link>
      ))}

      <Heading>Snacks you added</Heading>
      {!snacks.length ? (
        <EmptyState title="Nothing added yet" message="Help the community discover something new." />
      ) : null}
      {snacks.map((snack: any) => (
        <Link key={snack.id} href={`/snack/${snack.id}`} style={styles.activity}>
          <Text style={styles.activityTitle}>{snack.brand} · {snack.flavour}</Text>
          <Text style={styles.status}>{snack.status}</Text>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gate: { paddingTop: 80, gap: spacing.md },
  title: { color: colors.ink, fontSize: 32, fontWeight: "900", letterSpacing: -0.8 },
  copy: { color: colors.muted, lineHeight: 21 },
  notice: { color: colors.primaryDark, backgroundColor: "#FFF1C7", padding: spacing.md, borderRadius: radius.md },
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
  status: { color: colors.muted, textTransform: "capitalize" },
});
