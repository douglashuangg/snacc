import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Button, Field, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { signInSchema } from "@/lib/validation";

type Credentials = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const finish = () => {
    if (returnTo) router.replace(returnTo as never);
    else router.back();
  };

  const signIn = handleSubmit(async (credentials) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      Alert.alert("Could not sign in", error.message);
      return;
    }
    finish();
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>WELCOME TO SNACC</Text>
        <Text style={styles.title}>Sign in to save your snack opinions.</Text>
        <Text style={styles.copy}>
          Use the email and password for your existing account.
        </Text>
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
            autoComplete="password"
            error={errors.password?.message}
          />
        )}
      />

      <Button onPress={signIn} disabled={isSubmitting || !isSupabaseConfigured}>
        {isSubmitting ? "Working…" : "Sign in"}
      </Button>

      <Pressable
        onPress={() =>
          router.push({
            pathname: "/sign-up",
            params: returnTo ? { returnTo } : undefined,
          })
        }
        style={styles.linkRow}
      >
        <Text style={styles.link}>New here? Create an account</Text>
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
  linkRow: { alignItems: "center", paddingVertical: spacing.sm },
  link: {
    color: colors.primaryDark,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
