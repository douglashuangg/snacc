import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { Button, CategoryChips, Field, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import { findDuplicates, uploadSnackImage, useAddSnack, useTaxonomy } from "@/lib/queries";
import { snackSchema } from "@/lib/validation";
import { useAuth } from "@/providers/AuthProvider";
import type { PriceLevel, SnackInput } from "@/types/models";

type FormValues = z.infer<typeof snackSchema>;

const defaults: FormValues = {
  brand: "",
  product_name: "",
  flavour: "",
  description: "",
  image_url: "",
  subcategory_id: "",
  price_level: 2,
  category_ids: [],
};

export default function AddSnackScreen() {
  const { user, configured } = useAuth();
  const taxonomy = useTaxonomy();
  const addSnack = useAddSnack(user?.id);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(snackSchema), defaultValues: defaults });
  const categoryIds = useWatch({ control, name: "category_ids" });
  const subcategoryId = useWatch({ control, name: "subcategory_id" });
  const priceLevel = useWatch({ control, name: "price_level" });
  const imageUrl = useWatch({ control, name: "image_url" });

  if (!user) {
    return (
      <Screen>
        <View style={styles.gate}>
          <Text style={styles.title}>Add a snack to the community</Text>
          <Text style={styles.copy}>
            Sign in to submit a specific brand, product, and flavour.
          </Text>
          {!configured ? (
            <Text style={styles.notice}>Connect Supabase in .env before creating an account.</Text>
          ) : null}
          <Button onPress={() => router.push("/sign-in")}>Sign in or create account</Button>
        </View>
      </Screen>
    );
  }

  const chooseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      try {
        const url = await uploadSnackImage(asset.uri, user.id);
        setValue("image_url", url, { shouldValidate: true });
      } catch (error) {
        Alert.alert("Image upload failed", error instanceof Error ? error.message : "Try again.");
      }
    }
  };

  const submit = handleSubmit(async (values) => {
    try {
      const matches = await findDuplicates(values);
      const match = matches[0];
      if (match) {
        Alert.alert(
          "Possible duplicate",
          `${match.brand} ${match.product_name} — ${match.flavour} already exists.`,
          [
            { text: "Open existing", onPress: () => router.push(`/snack/${match.id}`) },
            { text: "Cancel", style: "cancel" },
          ],
        );
        return;
      }
      const snack = await addSnack.mutateAsync(values as SnackInput);
      router.replace(`/snack/${snack.id}`);
    } catch (error) {
      Alert.alert("Could not add snack", error instanceof Error ? error.message : "Try again.");
    }
  });

  return (
    <Screen>
      <Text style={styles.title}>What are we snacking on?</Text>
      <Text style={styles.copy}>Each flavour is its own entry. Package size does not matter.</Text>

      {imageUrl ? <Image source={imageUrl} style={styles.preview} contentFit="cover" /> : null}
      <View style={styles.actionRow}>
        <Button variant="secondary" icon="image-outline" onPress={chooseImage}>
          Upload image
        </Button>
      </View>

      {(["brand", "product_name", "flavour"] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <Field
              label={{ brand: "Brand", product_name: "Product name", flavour: "Flavour" }[name]}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors[name]?.message}
            />
          )}
        />
      ))}

      <Controller
        control={control}
        name="image_url"
        render={({ field }) => (
          <Field
            label="Or paste an image URL"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            keyboardType="url"
            error={errors.image_url?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <Field
            label="Description"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            maxLength={500}
            error={errors.description?.message}
          />
        )}
      />

      <Text style={styles.label}>Taste tags</Text>
      <CategoryChips
        categories={taxonomy.data?.categories ?? []}
        selected={categoryIds}
        onToggle={(id) =>
          setValue(
            "category_ids",
            categoryIds.includes(id)
              ? categoryIds.filter((item) => item !== id)
              : [...categoryIds, id],
            { shouldValidate: true },
          )
        }
      />
      {errors.category_ids ? <Text style={styles.error}>{errors.category_ids.message}</Text> : null}

      <Text style={styles.label}>Subcategory</Text>
      <View style={styles.wrap}>
        {taxonomy.data?.subcategories.map((item) => (
          <Choice
            key={item.id}
            label={item.name}
            active={subcategoryId === item.id}
            onPress={() => setValue("subcategory_id", item.id, { shouldValidate: true })}
          />
        ))}
      </View>
      {errors.subcategory_id ? <Text style={styles.error}>{errors.subcategory_id.message}</Text> : null}

      <Text style={styles.label}>Price level</Text>
      <View style={styles.wrap}>
        {([1, 2, 3] as PriceLevel[]).map((level) => (
          <Choice
            key={level}
            label={"$".repeat(level)}
            active={priceLevel === level}
            onPress={() => setValue("price_level", level)}
          />
        ))}
      </View>

      <Button onPress={submit} disabled={addSnack.isPending}>
        {addSnack.isPending ? "Adding snack…" : "Add snack"}
      </Button>
    </Screen>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gate: { paddingTop: 80, gap: spacing.md },
  title: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.7 },
  copy: { color: colors.muted, lineHeight: 22, fontSize: 16 },
  notice: { color: colors.primaryDark, backgroundColor: "#FFF1C7", padding: spacing.md, borderRadius: radius.md },
  preview: { height: 210, width: "100%", borderRadius: radius.lg, backgroundColor: colors.chip },
  actionRow: { alignItems: "flex-start" },
  label: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceActive: { backgroundColor: colors.ink },
  choiceText: { color: colors.ink, fontWeight: "700" },
  choiceTextActive: { color: colors.surface },
  error: { color: colors.danger },
});
