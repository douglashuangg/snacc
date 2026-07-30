import { createAdminClient } from "../_shared/database.ts";
import { parseProductTags } from "../_shared/flavour-parser.ts";
import {
  authorizeAdmin,
  errorResponse,
  jsonResponse,
} from "../_shared/http.ts";
import { IngestionRun } from "../_shared/ingestion-log.ts";
import { mapRakutenProduct } from "../_shared/product-mapper.ts";
import { storeRakutenProduct } from "../_shared/product-store.ts";
import {
  type ProductSearchParams,
  rakutenClientFromEnv,
} from "../_shared/rakuten-client.ts";
import { SNACK_KEYWORD_SEEDS } from "../_shared/seeds.ts";

interface SyncProductsInput {
  genreIds?: string[];
  keywords?: string[];
  maxPagesPerSeed?: number;
  dryRun?: boolean;
}

interface Seed {
  type: "genre" | "keyword";
  value: string;
}

function cleanStrings(value: unknown, pattern?: RegExp): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length >= 2 && (!pattern || pattern.test(item))),
    ),
  ];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const unauthorized = authorizeAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const input = await request.json() as SyncProductsInput;
    const genreIds = cleanStrings(input.genreIds, /^\d+$/u);
    const requestedKeywords = cleanStrings(input.keywords);
    const keywords = genreIds.length || requestedKeywords.length
      ? requestedKeywords
      : [...SNACK_KEYWORD_SEEDS];
    const seeds: Seed[] = [
      ...genreIds.map((value): Seed => ({ type: "genre", value })),
      ...keywords.map((value): Seed => ({ type: "keyword", value })),
    ].slice(0, 50);
    if (!seeds.length) {
      return jsonResponse(
        { error: "Provide at least one genre ID or keyword" },
        400,
      );
    }

    const maxPages = Math.min(
      Math.max(Math.trunc(Number(input.maxPagesPerSeed ?? 5)), 1),
      20,
    );
    const dryRun = input.dryRun === true;
    const rakuten = rakutenClientFromEnv();
    const admin = dryRun ? null : createAdminClient();
    const run = admin
      ? await IngestionRun.start(admin, "rakuten-sync-products", {
        genreIds,
        keywords,
        maxPagesPerSeed: maxPages,
      })
      : null;
    const samples: unknown[] = [];
    const warnings: string[] = [];
    let received = 0;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let completedPages = 0;

    for (const seed of seeds) {
      let page = 1;
      let pageCount = 1;
      while (page <= Math.min(pageCount, maxPages)) {
        const params: ProductSearchParams = {
          page,
          ...(seed.type === "genre"
            ? { genreId: seed.value }
            : { keyword: seed.value }),
        };
        try {
          run && (run.counters.pagesRequested += 1);
          const response = await rakuten.searchProducts(params);
          pageCount = response.pageCount;
          received += response.products.length;
          run && (run.counters.recordsReceived += response.products.length);

          for (const product of response.products) {
            if (samples.length < 10) {
              samples.push({
                product: mapRakutenProduct(product),
                tags: parseProductTags(product),
              });
            }
            if (!admin) continue;
            try {
              const result = await storeRakutenProduct(admin, product, seed);
              if (result.action === "inserted") {
                inserted += 1;
                run && (run.counters.recordsInserted += 1);
              } else {
                updated += 1;
                run && (run.counters.recordsUpdated += 1);
              }
              if (result.janConflict) {
                warnings.push(`JAN conflict for ${product.productId}`);
              }
              if (!product.mediumImageUrl) {
                warnings.push(`No image for ${product.productId}`);
              }
            } catch (error) {
              skipped += 1;
              run && (run.counters.recordsSkipped += 1);
              warnings.push(
                `${product.productId}: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              );
            }
          }
          completedPages += 1;
          await run?.checkpoint();
          page += 1;
          if (page <= Math.min(pageCount, maxPages)) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        } catch (error) {
          warnings.push(
            `${seed.type} "${seed.value}" page ${page}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          break;
        }
      }
    }

    const failedCompletely = completedPages === 0 && warnings.length > 0;
    const partial = warnings.some((warning) => warning.includes(" page ")) ||
      skipped > 0;
    const status = failedCompletely
      ? "failed"
      : partial
      ? "partial"
      : "succeeded";
    await run?.finish(
      status,
      warnings.length ? warnings.slice(0, 20).join("\n") : undefined,
    );

    return jsonResponse({
      runId: run?.id ?? null,
      status,
      dryRun,
      pagesRequested: run?.counters.pagesRequested ?? completedPages,
      recordsReceived: received,
      recordsInserted: inserted,
      recordsUpdated: updated,
      recordsSkipped: skipped,
      sample: samples,
      warnings: warnings.slice(0, 100),
    }, failedCompletely ? 502 : 200);
  } catch (error) {
    return errorResponse(error);
  }
});
