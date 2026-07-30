import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";

import { Button, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export default function OnboardingAvatarScreen() {
  const { user } = useAuth();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const finish = () => {
    router.replace("/(tabs)");
  };

  const uploadAndFinish = async () => {
    if (!image) {
      finish();
      return;
    }

    if (!user) return;

    try {
      setUploading(true);

      const base64 = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const ext = image.split(".").pop()?.toLowerCase() || "jpg";
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

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      finish();
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
      setUploading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Add a profile picture</Text>
        <Text style={styles.copy}>
          Make your profile stand out. You can also do this later.
        </Text>
      </View>

      <View style={styles.avatarContainer}>
        <Pressable onPress={pickImage} style={styles.avatarPicker} disabled={uploading}>
          {image ? (
            <Image source={image} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-circle-outline" size={80} color={colors.muted} />
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button onPress={uploadAndFinish} disabled={uploading}>
          {uploading ? "Saving…" : image ? "Save & Finish" : "Skip for now"}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  avatarContainer: { alignItems: "center", marginBottom: spacing.xl },
  avatarPicker: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholderText: { color: colors.primaryDark, fontWeight: "800" },
  actions: { marginTop: "auto", gap: spacing.sm },
});
