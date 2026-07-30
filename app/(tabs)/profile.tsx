import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button, EmptyState, ErrorState, Field, Heading, LoadingState, Screen, SnackCard } from "@/components/ui";
import { TasteRadarChart } from "@/components/TasteRadarChart";
import { colors, radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileScreen() {
  const { user, loading, signOut, configured } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Bookmarks Modal state
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);

  // Create List state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListCover, setNewListCover] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);

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

  const userLists = useQuery({
    queryKey: ["user-lists", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("*, list_items(count)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const userBookmarks = useQuery({
    queryKey: ["user-bookmarks-count", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("bookmarks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const bookmarkedSnacks = useQuery({
    queryKey: ["user-bookmarked-snacks", user?.id],
    enabled: Boolean(user) && showBookmarksModal,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, created_at, snacks(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pickListCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewListCover(result.assets[0].uri);
    }
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim()) {
      Alert.alert("Title required", "Please give your list a title.");
      return;
    }
    if (!user) return;

    try {
      setIsCreatingList(true);
      let coverUrl: string | null = null;

      if (newListCover) {
        const base64 = await FileSystem.readAsStringAsync(newListCover, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = newListCover.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${user.id}/list_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), {
            contentType: `image/${ext}`,
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          coverUrl = publicUrlData.publicUrl;
        }
      }

      const { error } = await supabase.from("lists").insert({
        user_id: user.id,
        title: newListTitle.trim(),
        description: newListDesc.trim() || null,
        cover_image_url: coverUrl,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["user-lists", user.id] });
      setNewListTitle("");
      setNewListDesc("");
      setNewListCover(null);
      setShowCreateModal(false);
    } catch (err) {
      Alert.alert("Could not create list", err instanceof Error ? err.message : "Try again.");
    } finally {
      setIsCreatingList(false);
    }
  };

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

      <Heading
        action={
          <Pressable
            style={styles.createListPill}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createListPillText}>New List</Text>
          </Pressable>
        }
      >
        Lists
      </Heading>

      <View style={styles.listsGrid}>
        {/* Default Bookmarks List */}
        <Pressable
          style={styles.listCard}
          onPress={() => router.push("/list/bookmarks")}
        >
          <View style={[styles.listCoverImage, styles.defaultListCover]}>
            <Ionicons name="bookmark" size={32} color={colors.primary} />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listTitle} numberOfLines={1}>
              Bookmarks
            </Text>
            <Text style={styles.listCount}>
              {userBookmarks.data ?? 0} {(userBookmarks.data ?? 0) === 1 ? "snack" : "snacks"}
            </Text>
          </View>
        </Pressable>

        {/* User Created Lists */}
        {userLists.data?.map((list: any) => {
          const itemCount = list.list_items?.[0]?.count ?? 0;
          return (
            <Pressable key={list.id} style={styles.listCard} onPress={() => router.push(`/list/${list.id}`)}>
              {list.cover_image_url ? (
                <Image source={list.cover_image_url} style={styles.listCoverImage} />
              ) : (
                <View style={[styles.listCoverImage, { alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="list" size={32} color={colors.muted} />
                </View>
              )}
              <View style={styles.listInfo}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {list.title}
                </Text>
                <Text style={styles.listCount}>
                  {itemCount} {itemCount === 1 ? "snack" : "snacks"}
                </Text>
              </View>
            </Pressable>
          );
        })}
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

      {/* Create List Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New List</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.ink} />
              </Pressable>
            </View>

            <Field
              label="List Title"
              value={newListTitle}
              onChangeText={setNewListTitle}
              placeholder="e.g. Favorite Japanese Chips"
            />

            <Field
              label="Description (Optional)"
              value={newListDesc}
              onChangeText={setNewListDesc}
              placeholder="e.g. My all-time top tier chips rank"
            />

            <Text style={styles.coverLabel}>Cover Image (Optional)</Text>
            <Pressable style={styles.coverPicker} onPress={pickListCover}>
              {newListCover ? (
                <Image source={newListCover} style={styles.coverPreview} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="image-outline" size={28} color={colors.muted} />
                  <Text style={styles.coverPlaceholderText}>Tap to pick cover image</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.modalActions}>
              <Button onPress={handleCreateList} disabled={isCreatingList}>
                {isCreatingList ? "Creating…" : "Create List"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  createListPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  createListPillText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
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
  defaultListCover: {
    backgroundColor: "#FFE5D9",
    alignItems: "center",
    justifyContent: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  coverLabel: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 14,
  },
  coverPicker: {
    width: "100%",
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  coverPreview: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  coverPlaceholderText: {
    color: colors.muted,
    fontWeight: "600",
    fontSize: 13,
  },
  modalActions: {
    marginTop: spacing.sm,
  },
  bookmarksModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
  },
  bookmarksModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bookmarksModalContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});
