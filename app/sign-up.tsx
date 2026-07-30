import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Button, Field, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { signInWithGoogle } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { signUpSchema } from "@/lib/validation";

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [googleBusy, setGoogleBusy] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const finish = () => {
    if (returnTo) router.replace(returnTo as never);
    else router.back();
  };

  const createWithEmail = handleSubmit(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Could not create account", error.message);
      return;
    }
    if (!data.session) {
      Alert.alert(
        "Check your inbox",
        "Confirm your email, then return here to sign in.",
      );
      router.replace({
        pathname: "/sign-in",
        params: returnTo ? { returnTo } : undefined,
      });
      return;
    }
    finish();
  });

  const createWithGoogle = async () => {
    try {
      setGoogleBusy(true);
      await signInWithGoogle();
      finish();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google sign-in failed";
      if (message === "Google sign-in was cancelled") return;
      const hint =
        /validation_failed|redirect/i.test(message)
          ? "\n\nIn Supabase Auth → URL Configuration, add snacc://** and exp://** to Redirect URLs. Check Metro logs for the exact redirectTo."
          : "";
      Alert.alert("Could not continue with Google", `${message}${hint}`);
    } finally {
      setGoogleBusy(false);
    }
  };

  const busy = isSubmitting || googleBusy;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>JOIN SNACC</Text>
        <Text style={styles.title}>Create your account.</Text>
        <Text style={styles.copy}>
          Continue with Google for a quick verified signup, or use email and a
          password.
        </Text>
      </View>

      {!isSupabaseConfigured ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Backend setup required</Text>
          <Text style={styles.copy}>
            Copy .env.example to .env and add your Supabase URL and public anon
            key. Enable Google in Supabase Auth providers and allow
            snacc://** and exp://** redirect URLs.
          </Text>
        </View>
      ) : null}

      <Button
        icon="logo-google"
        onPress={createWithGoogle}
        disabled={busy || !isSupabaseConfigured}
      >
        {googleBusy ? "Opening Google…" : "Continue with Google"}
      </Button>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerLabel}>or email</Text>
        <View style={styles.divider} />
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Field
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            error={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <Field
            label="Confirm password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            secureTextEntry
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
          />
        )}
      />

      <Button
        variant="secondary"
        onPress={createWithEmail}
        disabled={busy || !isSupabaseConfigured}
      >
        {isSubmitting ? "Creating…" : "Create account"}
      </Button>

      <Pressable
        onPress={() =>
          router.replace({
            pathname: "/sign-in",
            params: returnTo ? { returnTo } : undefined,
          })
        }
        style={styles.linkRow}
      >
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.md },
  kicker: { color: colors.primaryDark, fontWeight: "900", letterSpacing: 1 },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  notice: {
    backgroundColor: "#FFF1C7",
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  noticeTitle: { color: colors.ink, fontWeight: "900" },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  divider: { backgroundColor: colors.border, flex: 1, height: 1 },
  dividerLabel: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  linkRow: { alignItems: "center", paddingVertical: spacing.sm },
  link: {
    color: colors.primaryDark,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
