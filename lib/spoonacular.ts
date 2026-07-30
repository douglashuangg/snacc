import { useQuery } from "@tanstack/react-query";
import type { Snack } from "@/types/models";

const SPOONACULAR_API_KEY = process.env.EXPO_PUBLIC_SPOONACULAR_API_KEY;

export async function searchSpoonacular(query: string): Promise<Snack[]> {
  if (!query || !SPOONACULAR_API_KEY) return [];
  
  const url = `https://api.spoonacular.com/food/products/search?query=${encodeURIComponent(query)}&apiKey=${SPOONACULAR_API_KEY}&number=20`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Spoonacular API error");
    const data = await response.json();
    
    if (data && data.products) {
      return data.products.map((p: any) => ({
        id: `sp-${p.id}`,
        product_name: p.title,
        brand: p.title.split(' ')[0], // Best guess for brand if not provided
        flavour: "Spoonacular",
        image_url: p.image || null,
        description: "",
        subcategory_id: "",
        price_level: 1,
        status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        rating_count: 0,
        average_score: null,
      } as Snack));
    }
    return [];
  } catch (error) {
    console.error("Spoonacular search error:", error);
    return [];
  }
}

export function useSpoonacularSearch(query: string) {
  return useQuery({
    queryKey: ["spoonacular", query],
    queryFn: () => searchSpoonacular(query),
    enabled: query.length > 2,
  });
}
