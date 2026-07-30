import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sampleCategories, sampleSnacks, sampleSubcategories } from "@/lib/sample-data";
import { calculateOverallScore } from "@/lib/scoring";
import { isSupabaseConfigured, requireSupabase, supabase } from "@/lib/supabase";
import type {
  Category,
  Rating,
  RatingInput,
  Snack,
  SnackFilters,
  SnackInput,
  Subcategory,
} from "@/types/models";

const snackSelect = `
  *,
  subcategories (*),
  snack_categories (categories (*)),
  snack_images (image_url, is_primary, position),
  snack_rakuten_genres (rakuten_genres (genre_id, name_ja, path_ja)),
  ratings (taste, texture, value, packaging, buy_again, overall_score)
`;

function displayBrand(row: any): string {
  return (
    String(row.maker_name || row.brand || row.source_brand_name || "").trim() ||
    String(row.brand || "Unknown")
  );
}

function displayProductName(row: any): string {
  return (
    String(row.name_ja || row.product_name || "").trim() ||
    String(row.product_name || "Snack")
  );
}

function primaryImageUrl(row: any): string | null {
  if (row.image_url) return row.image_url;
  const images = [...(row.snack_images ?? [])].sort((a: any, b: any) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return Number(a.position ?? 0) - Number(b.position ?? 0);
  });
  return images[0]?.image_url ?? null;
}

function mapSnack(row: any): Snack {
  const ratings = (row.ratings ?? []) as Rating[];
  const average = (key: keyof Rating) =>
    ratings.length
      ? Math.round(
          (ratings.reduce((sum, rating) => sum + Number(rating[key]), 0) /
            ratings.length) *
            10,
        ) / 10
      : 0;
  const rakutenGenres = (row.snack_rakuten_genres ?? [])
    .map((item: any) => item.rakuten_genres)
    .filter(Boolean);
  return {
    ...row,
    brand: displayBrand(row),
    product_name: displayProductName(row),
    image_url: primaryImageUrl(row),
    maker_name: row.maker_name ?? null,
    name_ja: row.name_ja ?? null,
    rakuten_genres: rakutenGenres,
    categories: (row.snack_categories ?? [])
      .map((item: any) => item.categories)
      .filter(Boolean),
    rating_count: ratings.length,
    average_score: ratings.length ? average("overall_score") : null,
    factor_averages: ratings.length
      ? {
          taste: average("taste"),
          texture: average("texture"),
          value: average("value"),
          packaging: average("packaging"),
          buy_again: average("buy_again"),
        }
      : undefined,
  };
}

export async function fetchSnacks(filters: SnackFilters = {}): Promise<Snack[]> {
  let snacks: Snack[];
  if (!isSupabaseConfigured) {
    snacks = [...sampleSnacks];
  } else {
    let query = supabase.from("snacks").select(snackSelect).eq("status", "approved");
    if (filters.search?.trim()) {
      const term = filters.search.trim().replaceAll(",", "");
      query = query.or(
        `brand.ilike.%${term}%,product_name.ilike.%${term}%,flavour.ilike.%${term}%,name_ja.ilike.%${term}%,maker_name.ilike.%${term}%`,
      );
    }
    if (filters.subcategoryId) query = query.eq("subcategory_id", filters.subcategoryId);
    if (filters.priceLevel) query = query.eq("price_level", filters.priceLevel);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    snacks = (data ?? []).map(mapSnack);
  }

  if (filters.search && !isSupabaseConfigured) {
    const term = filters.search.toLowerCase();
    snacks = snacks.filter((snack) =>
      `${snack.brand} ${snack.product_name} ${snack.flavour}`.toLowerCase().includes(term),
    );
  }
  if (filters.categoryIds?.length) {
    snacks = snacks.filter((snack) =>
      filters.categoryIds!.every((id) => snack.categories?.some((category) => category.id === id)),
    );
  }
  if (filters.subcategoryId) snacks = snacks.filter((item) => item.subcategory_id === filters.subcategoryId);
  if (filters.priceLevel) snacks = snacks.filter((item) => item.price_level === filters.priceLevel);
  if (filters.minimumScore) snacks = snacks.filter((item) => (item.average_score ?? 0) >= filters.minimumScore!);
  return snacks.sort((a, b) => {
    if (filters.sort === "name") return `${a.brand}${a.flavour}`.localeCompare(`${b.brand}${b.flavour}`);
    if (filters.sort === "recent") return b.created_at.localeCompare(a.created_at);
    return (b.average_score ?? 0) - (a.average_score ?? 0);
  });
}

export async function fetchSnack(id: string): Promise<Snack> {
  if (id.startsWith('sp-')) {
    const spId = id.replace('sp-', '');
    const apiKey = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;
    const res = await fetch(`https://api.spoonacular.com/food/products/${spId}?apiKey=${apiKey}`);
    if (!res.ok) throw new Error("Failed to fetch from Spoonacular");
    const json = await res.json();
    return {
      id: `sp-${json.id}`,
      product_name: json.title,
      brand: json.brand || json.title.split(' ')[0],
      flavour: "Spoonacular",
      image_url: json.image || null,
      description: json.ingredientCount ? `Ingredients: ${json.ingredientCount}` : "",
      subcategory_id: "",
      price_level: 1,
      status: "approved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rating_count: 0,
      average_score: null,
    } as Snack;
  }

  if (!isSupabaseConfigured) {
    const snack = sampleSnacks.find((item) => item.id === id);
    if (!snack) throw new Error("Snack not found");
    return snack;
  }
  const { data, error } = await supabase.from("snacks").select(snackSelect).eq("id", id).single();
  if (error) throw error;
  return mapSnack(data);
}

export async function fetchTaxonomy(): Promise<{
  categories: Category[];
  subcategories: Subcategory[];
}> {
  if (!isSupabaseConfigured) {
    return { categories: sampleCategories, subcategories: sampleSubcategories };
  }
  const [categories, subcategories] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("subcategories").select("*").order("name"),
  ]);
  if (categories.error) throw categories.error;
  if (subcategories.error) throw subcategories.error;
  return {
    categories: categories.data as Category[],
    subcategories: subcategories.data as Subcategory[],
  };
}

export async function fetchReviews(snackId: string): Promise<Rating[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("ratings")
    .select("*, profiles(username, avatar_url)")
    .eq("snack_id", snackId)
    .not("review_text", "is", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Rating[];
}

export async function fetchMyRating(snackId: string, userId?: string): Promise<Rating | null> {
  if (!isSupabaseConfigured || !userId) return null;
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("snack_id", snackId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Rating | null;
}

export async function findDuplicates(input: Pick<SnackInput, "brand" | "product_name" | "flavour">) {
  if (!isSupabaseConfigured) {
    const normalized = `${input.brand}${input.product_name}${input.flavour}`.toLowerCase().replace(/\W/g, "");
    return sampleSnacks.filter(
      (snack) =>
        `${snack.brand}${snack.product_name}${snack.flavour}`.toLowerCase().replace(/\W/g, "") === normalized,
    );
  }
  const { data, error } = await supabase.rpc("find_duplicate_snacks", {
    input_brand: input.brand,
    input_product_name: input.product_name,
    input_flavour: input.flavour,
  });
  if (error) throw error;
  return (data ?? []) as Snack[];
}

export async function uploadSnackImage(uri: string, userId: string) {
  requireSupabase();
  const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${uniqueName}.${extension}`;
  const bytes = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from("snack-images").upload(path, bytes, {
    contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
  });
  if (error) throw error;
  return supabase.storage.from("snack-images").getPublicUrl(path).data.publicUrl;
}

export function useSnacks(filters: SnackFilters = {}) {
  return useQuery({ queryKey: ["snacks", filters], queryFn: () => fetchSnacks(filters) });
}

export function useSnack(id: string) {
  return useQuery({ queryKey: ["snack", id], queryFn: () => fetchSnack(id), enabled: Boolean(id) });
}

export function useTaxonomy() {
  return useQuery({ queryKey: ["taxonomy"], queryFn: fetchTaxonomy, staleTime: 1000 * 60 * 60 });
}

export function useReviews(snackId: string) {
  return useQuery({ queryKey: ["reviews", snackId], queryFn: () => fetchReviews(snackId) });
}

export function useMyRating(snackId: string, userId?: string) {
  return useQuery({
    queryKey: ["my-rating", snackId, userId],
    queryFn: () => fetchMyRating(snackId, userId),
  });
}

export function useAddSnack(userId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: SnackInput) => {
      requireSupabase();
      if (!userId) throw new Error("Sign in to add a snack.");
      const { category_ids, ...snack } = input;
      const { data, error } = await supabase
        .from("snacks")
        .insert({ ...snack, image_url: snack.image_url || null, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      const links = category_ids.map((category_id) => ({ snack_id: data.id, category_id }));
      const { error: linkError } = await supabase.from("snack_categories").insert(links);
      if (linkError) throw linkError;
      return data as Snack;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["snacks"] }),
  });
}

export function useSaveRating(snackId: string, userId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: RatingInput) => {
      requireSupabase();
      if (!userId) throw new Error("Sign in to rate this snack.");
      const { data, error } = await supabase
        .from("ratings")
        .upsert(
          {
            snack_id: snackId,
            user_id: userId,
            ...input,
            review_text: input.review_text?.trim() || null,
            overall_score: calculateOverallScore(input),
          },
          { onConflict: "snack_id,user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["snack", snackId] });
      client.invalidateQueries({ queryKey: ["reviews", snackId] });
      client.invalidateQueries({ queryKey: ["my-rating", snackId] });
    },
  });
}

export function useDeleteRating(snackId: string, userId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      requireSupabase();
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("ratings").delete().eq("snack_id", snackId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["snack", snackId] });
      client.invalidateQueries({ queryKey: ["reviews", snackId] });
      client.invalidateQueries({ queryKey: ["my-rating", snackId] });
    },
  });
}
