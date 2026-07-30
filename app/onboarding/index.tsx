import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Button, Field, Screen } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const namesSchema = z.object({
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(30, "Username too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  first_name: z.string().max(50, "Too long").optional(),
  last_name: z.string().max(50, "Too long").optional(),
});

type NamesData = z.infer<typeof namesSchema>;

export default function OnboardingNamesScreen() {
  const { user } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<NamesData>({
    resolver: zodResolver(namesSchema),
    defaultValues: { username: "", first_name: "", last_name: "" },
  });

  const submit = handleSubmit(async (data) => {
    if (!user) return;

    // Check username uniqueness
    const { data: existing, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .neq("id", user.id)
      .maybeSingle();

    if (checkError) {
      Alert.alert("Error", checkError.message);
      return;
    }
    if (existing) {
      setError("username", { message: "This username is already taken" });
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: data.username,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
      })
      .eq("id", user.id);

    if (updateError) {
      Alert.alert("Could not save", updateError.message);
      return;
    }

    router.push("/onboarding/avatar");
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Let's get to know you</Text>
        <Text style={styles.copy}>
          Set up your profile so the community knows who is rating these snacks!
        </Text>
      </View>

      <Controller
        control={control}
        name="username"
        render={({ field }) => (
          <Field
            label="Username"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoComplete="username"
            error={errors.username?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="first_name"
        render={({ field }) => (
          <Field
            label="First name (Optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            autoComplete="name-given"
            error={errors.first_name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="last_name"
        render={({ field }) => (
          <Field
            label="Last name (Optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="words"
            autoComplete="name-family"
            error={errors.last_name?.message}
          />
        )}
      />

      <Button onPress={submit} disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Continue"}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.md },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 22 },
});
