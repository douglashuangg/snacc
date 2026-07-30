/**
 * Database contract mirrored by supabase/migrations.
 * Run `supabase gen types typescript --local` after linking a project to replace
 * this lightweight contract with fully generated types.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      categories: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      subcategories: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      snacks: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      snack_categories: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      ratings: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      reports: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      snack_images: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_product_payloads: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_genres: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      snack_rakuten_genres: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_genre_subcategory_map: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      snack_tags: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_product_discoveries: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_ingestion_conflicts: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_ingestion_runs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
      rakuten_snack_cards: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
    };
    Views: {
      snack_summaries: { Row: Record<string, unknown>; Relationships: [] };
      rakuten_pending_review: { Row: Record<string, unknown>; Relationships: [] };
    };
    Functions: {
      find_duplicate_snacks: { Args: Record<string, string>; Returns: Record<string, unknown>[] };
      approve_rakuten_snack: { Args: Record<string, unknown>; Returns: Record<string, unknown> };
    };
    Enums: {
      snack_status: "pending" | "approved" | "rejected";
      report_status: "open" | "resolved" | "dismissed";
      snack_origin_status: "confirmed_japanese" | "likely_japanese" | "unknown" | "not_japanese";
      snack_tag_type: "flavour" | "taste" | "texture" | "dietary" | "other";
    };
    CompositeTypes: Record<never, never>;
  };
}
