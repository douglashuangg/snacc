import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button, EmptyState, Heading, LoadingState, Screen } from "@/components/ui";
import { TasteRadarChart } from "@/components/TasteRadarChart";
import { colors, radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileScreen() {
  const { user, loading, signOut, configured } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

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

  const changeAvatar = async () => {
    if (!user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploading(true);
      const uri = result.assets[0].uri;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(base64), {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Append timestamp to bust cache
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingState label="Loading profile…" />;
  if (!user) {
    return (
      <Screen>
        <View style={styles.gate}>
          <Text style={styles.title}>Keep track of your snack takes.</Text>
          <Text style={styles.copy}>
            Create an account to rate, review, and add snacks.
          </Text>
          <Button onPress={() => router.push("/sign-in")}>Sign in or create account</Button>
        </View>
      </Screen>
    );
  }

  const p = profile.data;
  const displayName = p?.username || user.email;
  const subtitle = p?.first_name
    ? `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}`
    : `Snack member since ${new Date(user.created_at).toLocaleDateString()}`;

  const ratings = activity.data?.ratings ?? [];
  return (
    <Screen>
      <View style={styles.profile}>
        <Pressable onPress={changeAvatar} disabled={uploading} style={styles.avatarWrap}>
          {p?.avatar_url ? (
            <Image source={p.avatar_url} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-circle" size={80} color={colors.muted} />
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.email}>{displayName}</Text>
          <Text style={styles.copy}>{subtitle}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{ratings.length}</Text>
              <Text style={styles.statLabel}>Snacked</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>
      </View>
      <Heading>Taste Profile</Heading>
      <View style={styles.sectionCard}>
        <TasteRadarChart />
      </View>

      <Heading>Lists</Heading>
      <View style={styles.listsGrid}>
        <Pressable
          style={styles.createListGridCard}
          onPress={() => Alert.alert("Create List", "Custom list creation coming soon!")}
        >
          <View style={styles.createListContent}>
            <Ionicons name="add-circle-outline" size={36} color={colors.primary} />
            <Text style={styles.createListCardText}>Create list</Text>
          </View>
        </Pressable>
      </View>

      <View style={{ marginTop: spacing.xl }}>
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
      </View>
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
  avatarWrap: { position: "relative" },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  editBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  email: { color: colors.ink, fontWeight: "800", fontSize: 17 },
  statsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  statItem: {
    alignItems: "flex-start",
  },
  statNumber: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
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
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionLabel: { color: colors.ink, fontWeight: "700", flex: 1 },
  sectionValue: { color: colors.primary, fontWeight: "900", fontSize: 16 },
  listsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  createListGridCard: {
    width: "47.5%",
    height: 170,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  createListContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  createListIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE5D9",
    alignItems: "center",
    justifyContent: "center",
  },
  createListCardText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },
  listCard: {
    width: "47.5%",
    height: 170,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  listCoverImage: {
    width: "100%",
    height: "68%",
    backgroundColor: colors.chip,
  },
  listInfo: {
    padding: spacing.xs,
  },
  listTitle: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 14,
  },
  listCount: {
    color: colors.muted,
    fontSize: 12,
  },
});
