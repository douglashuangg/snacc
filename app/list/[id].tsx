import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  ErrorState,
  Heading,
  LoadingState,
  Screen,
  SnackCard,
} from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isBookmarks = id === "bookmarks";

  // Query for default Bookmarks list
  const bookmarksQuery = useQuery({
    queryKey: ["user-bookmarked-snacks", user?.id],
    enabled: isBookmarks && Boolean(user),
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

  // Query for custom user list
  const customListQuery = useQuery({
    queryKey: ["custom-list", id],
    enabled: !isBookmarks && Boolean(id),
    queryFn: async () => {
      const listRes = await supabase
        .from("lists")
        .select("*, list_items(*, snacks(*))")
        .eq("id", id)
        .single();
      if (listRes.error) throw listRes.error;
      return listRes.data;
    },
  });

  if (isBookmarks) {
    const data = bookmarksQuery.data ?? [];
    return (
      <Screen>
        <Stack.Screen options={{ title: "Bookmarks" }} />
        <View style={styles.header}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="bookmark" size={32} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Bookmarks</Text>
            <Text style={styles.subtitle}>
              {data.length} {data.length === 1 ? "snack" : "snacks"} saved
            </Text>
          </View>
        </View>

        {bookmarksQuery.isLoading ? <LoadingState label="Loading bookmarks…" /> : null}
        {bookmarksQuery.error ? (
          <ErrorState
            message={bookmarksQuery.error.message}
            retry={() => bookmarksQuery.refetch()}
          />
        ) : null}

        {!bookmarksQuery.isLoading && !data.length ? (
          <EmptyState
            title="No bookmarks yet"
            message="Tap the bookmark icon on any snack page to save your favorite picks here!"
          />
        ) : null}

        {data.map((item: any) => {
          const snack = item.snacks;
          if (!snack) return null;
          return <SnackCard key={item.id} snack={snack} />;
        })}
      </Screen>
    );
  }

  // Custom User List Screen
  if (customListQuery.isLoading) return <LoadingState label="Loading list…" />;
  if (customListQuery.error || !customListQuery.data) {
    return (
      <ErrorState
        message={customListQuery.error?.message ?? "List not found."}
        retry={() => customListQuery.refetch()}
      />
    );
  }

  const list = customListQuery.data;
  const items = list.list_items ?? [];

  return (
    <Screen>
      <Stack.Screen options={{ title: list.title }} />

      {list.cover_image_url ? (
        <Image source={list.cover_image_url} style={styles.coverImage} contentFit="cover" />
      ) : null}

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{list.title}</Text>
          {list.description ? <Text style={styles.description}>{list.description}</Text> : null}
          <Text style={styles.subtitle}>
            {items.length} {items.length === 1 ? "snack" : "snacks"}
          </Text>
        </View>
      </View>

      {!items.length ? (
        <EmptyState
          title="No snacks in this list"
          message="Add snacks to this list when browsing or exploring!"
        />
      ) : null}

      {items.map((item: any) => {
        const snack = item.snacks;
        if (!snack) return null;
        return <SnackCard key={item.snack_id} snack={snack} />;
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFE5D9",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    marginTop: spacing.xxs ?? 2,
  },
  subtitle: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
