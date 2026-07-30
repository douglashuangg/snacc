export interface RakutenDetail {
  name: string;
  value: string;
}

export interface RakutenProduct {
  productId: string;
  productCode?: string | null;
  productName?: string | null;
  brandName?: string | null;
  mediumImageUrl?: string | null;
  productCaption?: string | null;
  releaseDate?: string | null;
  makerName?: string | null;
  makerNameFormal?: string | null;
  itemCount?: number | string | null;
  salesItemCount?: number | string | null;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  salesMinPrice?: number | string | null;
  salesMaxPrice?: number | string | null;
  averagePrice?: number | string | null;
  reviewCount?: number | string | null;
  reviewAverage?: number | string | null;
  reviewUrlPC?: string | null;
  rank?: number | string | null;
  rankTargetGenreId?: string | null;
  rankTargetProductCount?: number | string | null;
  genreId?: string | null;
  genreName?: string | null;
  detail?: RakutenDetail[] | null;
  productUrlPC?: string | null;
  [key: string]: unknown;
}

export interface RakutenProductSearchResponse {
  count: number;
  page: number;
  pageCount: number;
  products: RakutenProduct[];
  raw: Record<string, unknown>;
}

export interface RakutenGenre {
  genreId: string;
  nameJa: string;
  level: number;
}

export interface RakutenGenreResponse {
  ancestors: RakutenGenre[];
  genre: RakutenGenre;
  siblings: RakutenGenre[];
  children: RakutenGenre[];
  attributes: unknown[];
  raw: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unwrapCollection(
  raw: Record<string, unknown>,
  keys: string[],
): unknown[] {
  for (const key of keys) {
    if (Array.isArray(raw[key])) return raw[key];
  }
  return [];
}

function unwrapProduct(value: unknown): RakutenProduct | null {
  if (!isRecord(value)) return null;
  const candidate = isRecord(value.Product)
    ? value.Product
    : isRecord(value.product)
    ? value.product
    : value;
  return typeof candidate.productId === "string" && candidate.productId.trim()
    ? candidate as RakutenProduct
    : null;
}

export function parseProductSearchResponse(
  value: unknown,
): RakutenProductSearchResponse {
  if (!isRecord(value)) {
    throw new Error("Rakuten Product Search returned a non-object response");
  }
  const products = unwrapCollection(value, [
    "Products",
    "products",
    "Items",
    "items",
  ])
    .map(unwrapProduct)
    .filter((product): product is RakutenProduct => product !== null);

  if (
    !Array.isArray(value.Products) && !Array.isArray(value.products) &&
    !Array.isArray(value.Items) && !Array.isArray(value.items)
  ) {
    throw new Error(
      "Rakuten Product Search response did not include a product collection",
    );
  }

  return {
    count: toFiniteNumber(value.count),
    page: toFiniteNumber(value.page, 1),
    pageCount: Math.min(100, toFiniteNumber(value.pageCount, 1)),
    products,
    raw: value,
  };
}

function parseGenre(value: unknown): RakutenGenre | null {
  if (!isRecord(value)) return null;
  const rawId = value.genreId;
  const genreId = typeof rawId === "number" && Number.isFinite(rawId)
    ? String(rawId)
    : typeof rawId === "string"
    ? rawId.trim()
    : "";
  if (genreId === "") return null;
  const name = value.nameJa ?? value.genreName ?? "";
  if (typeof name !== "string") return null;
  return {
    genreId,
    nameJa: name,
    level: toFiniteNumber(value.level ?? value.genreLevel),
  };
}

function parseGenres(value: unknown): RakutenGenre[] {
  return Array.isArray(value)
    ? value.map(parseGenre).filter((genre): genre is RakutenGenre =>
      genre !== null
    )
    : [];
}

export function parseGenreResponse(value: unknown): RakutenGenreResponse {
  if (!isRecord(value)) {
    throw new Error("Rakuten Genre Search returned a non-object response");
  }
  const current = parseGenre(value.genre ?? value.current);
  if (!current) {
    throw new Error(
      "Rakuten Genre Search response did not include the current genre",
    );
  }
  return {
    ancestors: parseGenres(value.ancestors),
    genre: current,
    siblings: parseGenres(value.siblings),
    children: parseGenres(value.children),
    attributes: Array.isArray(value.attributes) ? value.attributes : [],
    raw: value,
  };
}
