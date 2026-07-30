import {
  extractPackageEvidence,
  normalizeJapaneseText,
  nullableInt,
  nullableNumber,
  nullableText,
  parseRakutenDate,
} from "./normalize.ts";
import type { RakutenProduct } from "./rakuten-types.ts";

export interface MappedProduct {
  source_type: "rakuten";
  rakuten_product_id: string;
  jan_code: string | null;
  name_ja: string | null;
  normalized_name_ja: string;
  source_brand_name: string | null;
  maker_name: string | null;
  maker_name_formal: string | null;
  description_ja: string | null;
  package_size_text: string | null;
  unit_count: number | null;
  release_date: string | null;
  rakuten_product_url: string | null;
  rakuten_review_url: string | null;
  rakuten_review_average: number | null;
  rakuten_review_count: number | null;
  price_min_jpy: number | null;
  price_max_jpy: number | null;
  price_average_jpy: number | null;
  price_source: "product_purchasable" | "product_all_listings";
  available_listing_count: number | null;
  listing_count: number | null;
  rakuten_rank: number | null;
  rakuten_rank_genre_id: string | null;
  rakuten_rank_pool_size: number | null;
  source_last_seen_at: string;
  source_updated_at: string;
}

export function mapRakutenProduct(
  product: RakutenProduct,
  now = new Date(),
): MappedProduct {
  const salesMin = nullableInt(product.salesMinPrice);
  const salesMax = nullableInt(product.salesMaxPrice);
  const packageEvidence = extractPackageEvidence(
    [product.productName, product.productCaption].filter(Boolean).join(" "),
  );
  const timestamp = now.toISOString();

  return {
    source_type: "rakuten",
    rakuten_product_id: product.productId,
    jan_code: nullableText(product.productCode),
    name_ja: nullableText(product.productName),
    normalized_name_ja: normalizeJapaneseText(product.productName),
    source_brand_name: nullableText(product.brandName),
    maker_name: nullableText(product.makerName),
    maker_name_formal: nullableText(product.makerNameFormal),
    description_ja: nullableText(product.productCaption),
    package_size_text: packageEvidence.packageSizeText,
    unit_count: packageEvidence.unitCount,
    release_date: parseRakutenDate(product.releaseDate),
    rakuten_product_url: nullableText(product.productUrlPC),
    rakuten_review_url: nullableText(product.reviewUrlPC),
    rakuten_review_average: nullableNumber(product.reviewAverage),
    rakuten_review_count: nullableInt(product.reviewCount),
    price_min_jpy: salesMin ?? nullableInt(product.minPrice),
    price_max_jpy: salesMax ?? nullableInt(product.maxPrice),
    price_average_jpy: nullableInt(product.averagePrice),
    price_source: salesMin !== null || salesMax !== null
      ? "product_purchasable"
      : "product_all_listings",
    available_listing_count: nullableInt(product.salesItemCount),
    listing_count: nullableInt(product.itemCount),
    rakuten_rank: nullableInt(product.rank),
    rakuten_rank_genre_id: nullableText(product.rankTargetGenreId),
    rakuten_rank_pool_size: nullableInt(product.rankTargetProductCount),
    source_last_seen_at: timestamp,
    source_updated_at: timestamp,
  };
}

export function initialDisplayFields(product: RakutenProduct): {
  brand: string | null;
  product_name: string | null;
  image_url: string | null;
} {
  return {
    brand: nullableText(product.brandName),
    product_name: nullableText(product.productName),
    image_url: nullableText(product.mediumImageUrl),
  };
}
