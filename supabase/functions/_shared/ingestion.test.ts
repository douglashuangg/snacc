import { PARSER_VERSION } from "./flavour-taxonomy.ts";
import { parseProductTags } from "./flavour-parser.ts";
import {
  extractPackageEvidence,
  normalizeJapaneseText,
  parseRakutenDate,
} from "./normalize.ts";
import { mapRakutenProduct } from "./product-mapper.ts";
import { RakutenClient } from "./rakuten-client.ts";
import { fetchJsonWithRetry, HttpError } from "./retry.ts";
import {
  parseGenreResponse,
  parseProductSearchResponse,
  type RakutenProduct,
} from "./rakuten-types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
}

const COMPLETE_PRODUCT: RakutenProduct = {
  productId: "product-1",
  productCode: "4900000000001",
  productName: "【送料無料】抹茶チョコ 10袋",
  brandName: "テストブランド",
  makerName: "テスト製菓",
  mediumImageUrl: "https://example.com/snack.jpg",
  productCaption: "サクサク食感の甘い抹茶チョコレート",
  releaseDate: "20260719",
  salesMinPrice: 300,
  salesMaxPrice: 500,
  averagePrice: 400,
  reviewAverage: "4.8",
  reviewCount: "120",
  genreId: "551167",
  genreName: "スナック菓子",
  detail: [{ name: "内容量", value: "30g × 10袋" }],
  productUrlPC: "https://example.com/product",
};

Deno.test("normalizes Japanese text without erasing its identity", () => {
  assertEquals(
    normalizeJapaneseText("【送料無料】 ﾏｯﾁｬ　抹茶"),
    "マッチャ 抹茶",
  );
  assert(
    normalizeJapaneseText("抹茶") !== normalizeJapaneseText("いちご"),
    "Japanese names must remain distinct",
  );
});

Deno.test("maps complete and null-heavy Product Search records", () => {
  const mapped = mapRakutenProduct(
    COMPLETE_PRODUCT,
    new Date("2026-07-19T00:00:00Z"),
  );
  assertEquals(mapped.price_min_jpy, 300);
  assertEquals(mapped.price_source, "product_purchasable");
  assertEquals(mapped.release_date, "2026-07-19");
  assertEquals(mapped.unit_count, 10);
  assertEquals(mapped.rakuten_review_average, 4.8);

  const sparse = mapRakutenProduct({ productId: "sparse", productName: null });
  assertEquals(sparse.name_ja, null);
  assertEquals(sparse.price_min_jpy, null);
  assertEquals(sparse.normalized_name_ja, "");
});

Deno.test("extracts versioned tags with evidence and implications", () => {
  const tags = parseProductTags({
    ...COMPLETE_PRODUCT,
    productName: "わさび味 サクサクスナック",
  });
  const wasabi = tags.find((tag) => tag.tag_key === "wasabi");
  const spicy = tags.find((tag) => tag.tag_key === "spicy");
  assertEquals(wasabi?.confidence, 0.95);
  assertEquals(spicy?.confidence, 0.55);
  assertEquals(wasabi?.parser_version, PARSER_VERSION);
  assert(Boolean(wasabi?.evidence_text), "Tag evidence should be retained");
});

Deno.test("parses format-version two and wrapped Product Search responses", () => {
  const direct = parseProductSearchResponse({
    count: 1,
    page: 1,
    pageCount: 1,
    Products: [COMPLETE_PRODUCT],
  });
  assertEquals(direct.products[0].productId, "product-1");

  const wrapped = parseProductSearchResponse({
    count: 1,
    Items: [{ Product: COMPLETE_PRODUCT }],
  });
  assertEquals(wrapped.products.length, 1);
});

Deno.test("parses Genre Search responses with numeric genreIds", () => {
  const parsed = parseGenreResponse({
    ancestors: [],
    genre: { genreId: 0, nameJa: "", level: 0 },
    siblings: [],
    children: [
      { genreId: 100371, nameJa: "食品", level: 1 },
      { genreId: "551177", nameJa: "スイーツ・お菓子", level: 1 },
    ],
    attributes: [],
  });
  assertEquals(parsed.genre.genreId, "0");
  assertEquals(parsed.genre.nameJa, "");
  assertEquals(parsed.children.map((child) => child.genreId), [
    "100371",
    "551177",
  ]);
});

Deno.test("parses package and Rakuten date evidence safely", () => {
  assertEquals(extractPackageEvidence("30g x 12袋"), {
    packageSizeText: "30g x 12袋",
    unitCount: 12,
  });
  assertEquals(parseRakutenDate("2026年7月19日"), "2026-07-19");
  assertEquals(parseRakutenDate("not-a-date"), null);
});

Deno.test("sends Rakuten credentials as working query parameters", async () => {
  let requestedUrl = "";
  let requestedHeaders: HeadersInit | undefined;
  const client = new RakutenClient(
    {
      applicationId: "app-id",
      accessKey: "access-key",
      origin: "https://localhost",
    },
    {
      attempts: 1,
      fetchImpl: async (input, init) => {
        requestedUrl = String(input);
        requestedHeaders = init?.headers;
        return new Response(JSON.stringify({
          ancestors: [],
          genre: { genreId: "0", nameJa: "root", level: 0 },
          siblings: [],
          children: [],
          attributes: [],
        }));
      },
    },
  );

  await client.searchGenre("0");
  const url = new URL(requestedUrl);
  assertEquals(url.searchParams.get("applicationId"), "app-id");
  assertEquals(url.searchParams.get("accessKey"), "access-key");
  assertEquals(url.searchParams.get("genreId"), "0");
  assertEquals(url.searchParams.get("formatVersion"), null);
  const headers = new Headers(requestedHeaders);
  assertEquals(headers.get("accessKey"), null);
  assertEquals(headers.get("origin"), "https://localhost");
  assertEquals(headers.get("referer"), "https://localhost/");
});

Deno.test("omits Origin and Referer when origin is unset (Backend/IP mode)", async () => {
  let requestedHeaders: HeadersInit | undefined;
  const client = new RakutenClient(
    {
      applicationId: "app-id",
      accessKey: "access-key",
    },
    {
      attempts: 1,
      fetchImpl: async (_input, init) => {
        requestedHeaders = init?.headers;
        return new Response(JSON.stringify({
          ancestors: [],
          genre: { genreId: "0", nameJa: "root", level: 0 },
          siblings: [],
          children: [],
          attributes: [],
        }));
      },
    },
  );

  await client.searchGenre("0");
  const headers = new Headers(requestedHeaders);
  assertEquals(headers.get("origin"), null);
  assertEquals(headers.get("referer"), null);
  assertEquals(headers.get("accept"), "application/json");
});

Deno.test("retries retryable responses and eventually succeeds", async () => {
  let calls = 0;
  const result = await fetchJsonWithRetry("https://example.test", {}, {
    attempts: 3,
    delaysMs: [0, 0],
    sleep: async () => {},
    random: () => 0,
    fetchImpl: async () => {
      calls += 1;
      return calls < 3
        ? new Response('{"error_description":"slow down"}', { status: 429 })
        : new Response('{"ok":true}', { status: 200 });
    },
  });
  assertEquals(calls, 3);
  assertEquals(result, { ok: true });
});

Deno.test("does not retry non-retryable responses", async () => {
  let calls = 0;
  try {
    await fetchJsonWithRetry("https://example.test", {}, {
      fetchImpl: async () => {
        calls += 1;
        return new Response('{"error_description":"bad input"}', {
          status: 400,
        });
      },
    });
    throw new Error("Expected request to fail");
  } catch (error) {
    assert(error instanceof HttpError, "Expected an HttpError");
    assertEquals(error.status, 400);
    assertEquals(calls, 1);
  }
});
