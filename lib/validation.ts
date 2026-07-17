import { z } from "zod";

const cleanText = (label: string, min: number, max: number) =>
  z.string().trim().min(min, `${label} is required`).max(max);

export const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const snackSchema = z.object({
  brand: cleanText("Brand", 1, 80),
  product_name: cleanText("Product name", 1, 120),
  flavour: cleanText("Flavour", 1, 120),
  description: z.string().trim().max(500).optional(),
  image_url: z.union([z.url("Enter a valid image URL"), z.literal("")]).optional(),
  subcategory_id: z.string().uuid("Choose a subcategory"),
  price_level: z.number().int().min(1).max(3),
  category_ids: z.array(z.string().uuid()).min(1, "Choose at least one taste"),
});

export const ratingSchema = z.object({
  taste: z.coerce.number().int().min(1).max(10),
  texture: z.coerce.number().int().min(1).max(10),
  value: z.coerce.number().int().min(1).max(10),
  packaging: z.coerce.number().int().min(1).max(10),
  buy_again: z.coerce.number().int().min(1).max(10),
  review_text: z.string().trim().max(500).optional(),
});

export const reportSchema = z.object({
  reason: cleanText("Reason", 3, 300),
});
