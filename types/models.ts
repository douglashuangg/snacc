export type PriceLevel = 1 | 2 | 3;
export type SnackStatus = "pending" | "approved" | "rejected";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

export interface Rating {
  id: string;
  snack_id: string;
  user_id: string;
  taste: number;
  texture: number;
  value: number;
  packaging: number;
  buy_again: number;
  overall_score: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
}

export interface Snack {
  id: string;
  brand: string;
  product_name: string;
  flavour: string;
  description: string | null;
  image_url: string | null;
  subcategory_id: string;
  price_level: PriceLevel;
  created_by: string | null;
  status: SnackStatus;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory | null;
  categories?: Category[];
  average_score?: number | null;
  rating_count?: number;
  factor_averages?: {
    taste: number;
    texture: number;
    value: number;
    packaging: number;
    buy_again: number;
  };
}

export interface RatingInput {
  taste: number;
  texture: number;
  value: number;
  packaging: number;
  buy_again: number;
  review_text?: string;
}

export interface SnackInput {
  brand: string;
  product_name: string;
  flavour: string;
  description?: string;
  image_url?: string;
  subcategory_id: string;
  price_level: PriceLevel;
  category_ids: string[];
}

export interface SnackFilters {
  search?: string;
  categoryIds?: string[];
  subcategoryId?: string;
  priceLevel?: PriceLevel;
  minimumScore?: number;
  sort?: "top" | "recent" | "name";
}
