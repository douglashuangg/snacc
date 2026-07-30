export type PriceLevel = 1 | 2 | 3;
export type SnackStatus = "pending" | "approved" | "rejected";
export type SnackSourceType = "community" | "rakuten";
export type SnackOriginStatus =
  | "confirmed_japanese"
  | "likely_japanese"
  | "unknown"
  | "not_japanese";

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
  source_type?: SnackSourceType;
  rakuten_product_id?: string | null;
  jan_code?: string | null;
  name_ja?: string | null;
  source_brand_name?: string | null;
  maker_name?: string | null;
  maker_name_formal?: string | null;
  description_ja?: string | null;
  package_size_text?: string | null;
  rakuten_product_url?: string | null;
  rakuten_review_url?: string | null;
  rakuten_review_average?: number | null;
  rakuten_review_count?: number | null;
  price_min_jpy?: number | null;
  price_max_jpy?: number | null;
  price_average_jpy?: number | null;
  origin_status?: SnackOriginStatus;
  subcategories?: Subcategory | null;
  categories?: Category[];
  /** Primary Rakuten genre path for category hint chips. */
  rakuten_genres?: Array<{
    genre_id: string;
    name_ja: string;
    path_ja?: string[] | null;
  }>;
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
