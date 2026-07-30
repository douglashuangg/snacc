import {
  type AdminClient,
  createAdminClient,
} from "../functions/_shared/database.ts";
import { parseProductTags } from "../functions/_shared/flavour-parser.ts";
import { mapGenreResponse } from "../functions/_shared/genre-mapper.ts";
import { IngestionRun } from "../functions/_shared/ingestion-log.ts";
import { mapRakutenProduct } from "../functions/_shared/product-mapper.ts";
import { storeRakutenProduct } from "../functions/_shared/product-store.ts";
import {
  type ProductSearchParams,
  rakutenClientFromEnv,
} from "../functions/_shared/rakuten-client.ts";
import type { RakutenGenre } from "../functions/_shared/rakuten-types.ts";
import { SNACK_KEYWORD_SEEDS } from "../functions/_shared/seeds.ts";

type Command = "genres" | "products";

export interface ImportOptions {
  command: Command;
  dryRun: boolean;
  genreIds: string[];
  keywords: string[];
  depth: number;
  maxGenres: number;
  maxPages: number;
}

const HELP = `
Local Rakuten importer

Genres:
  deno run ... rakuten-import.ts genres [--genre-id 0] [--depth 2] [--max-genres 250] [--dry-run]

Products:
  deno run ... rakuten-import.ts products [--keyword グミ] [--genre-id 551167] [--max-pages 2] [--dry-run]

Flags may be repeated for multiple --keyword or --genre-id values.
`.trim();

function boundedInteger(
  value: string | undefined,
  label: string,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

export function parseImportArgs(args: string[]): ImportOptions {
  const [commandValue, ...flags] = args;
  if (commandValue === "--help" || commandValue === "-h") {
    throw new Error(HELP);
  }
  if (commandValue !== "genres" && commandValue !== "products") {
    throw new Error(`Choose either "genres" or "products".\n\n${HELP}`);
  }

  const genreIds: string[] = [];
  const keywords: string[] = [];
  let dryRun = false;
  let depth = 2;
  let maxGenres = 250;
  let maxPages = 2;

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--dry-run") {
      dryRun = true;
      continue;
    }
    const value = flags[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    index += 1;
    switch (flag) {
      case "--genre-id":
        if (!/^\d+$/u.test(value)) {
          throw new Error("--genre-id must contain only digits");
        }
        genreIds.push(value);
        break;
      case "--keyword":
        if (value.trim().length < 2) {
          throw new Error("--keyword must contain at least two characters");
        }
        keywords.push(value.trim());
        break;
      case "--depth":
        depth = boundedInteger(value, "--depth", 0, 8);
        break;
      case "--max-genres":
        maxGenres = boundedInteger(value, "--max-genres", 1, 1_000);
        break;
      case "--max-pages":
        maxPages = boundedInteger(value, "--max-pages", 1, 20);
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  if (commandValue === "genres" && keywords.length) {
    throw new Error("--keyword is only valid for the products command");
  }
  if (commandValue === "products" && !genreIds.length && !keywords.length) {
    keywords.push(...SNACK_KEYWORD_SEEDS);
  }

  return {
    command: commandValue,
    dryRun,
    genreIds: [
      ...new Set(
        genreIds.length || commandValue === "products" ? genreIds : ["0"],
      ),
    ],
    keywords: [...new Set(keywords)],
    depth,
    maxGenres,
    maxPages,
  };
}

async function upsertGenreRows(
  admin: AdminClient,
  rows: ReturnType<typeof mapGenreResponse>,
): Promise<{ inserted: number; updated: number }> {
  const ids = rows.map((row) => row.genre_id);
  const { data: existing, error: existingError } = await admin
    .from("rakuten_genres")
    .select("genre_id")
    .in("genre_id", ids);
  if (existingError) throw new Error(existingError.message);
  const { error } = await admin.from("rakuten_genres").upsert(rows, {
    onConflict: "genre_id",
  });
  if (error) throw new Error(error.message);
  const updated = existing?.length ?? 0;
  return { inserted: rows.length - updated, updated };
}

async function importGenres(options: ImportOptions) {
  const rakuten = rakutenClientFromEnv();
  const admin = options.dryRun ? null : createAdminClient();
  const run = admin
    ? await IngestionRun.start(admin, "local-rakuten-genres", {
      genreIds: options.genreIds,
      depth: options.depth,
      maxGenres: options.maxGenres,
    })
    : null;
  const queue = options.genreIds.map((genreId) => ({ genreId, depth: 0 }));
  const visited = new Set<string>();
  const sample: unknown[] = [];
  let rowsMapped = 0;
  let failure: Error | null = null;

  while (queue.length && visited.size < options.maxGenres) {
    const next = queue.shift()!;
    if (visited.has(next.genreId)) continue;
    visited.add(next.genreId);
    try {
      run && (run.counters.pagesRequested += 1);
      const response = await rakuten.searchGenre(next.genreId);
      const rows = mapGenreResponse(response);
      rowsMapped += rows.length;
      run && (run.counters.recordsReceived += rows.length);
      if (sample.length < 10) sample.push(...rows.slice(0, 10 - sample.length));
      if (admin) {
        const counts = await upsertGenreRows(admin, rows);
        if (run) {
          run.counters.recordsInserted += counts.inserted;
          run.counters.recordsUpdated += counts.updated;
        }
      }
      if (next.depth < options.depth) {
        queue.push(...response.children.map((genre: RakutenGenre) => ({
          genreId: genre.genreId,
          depth: next.depth + 1,
        })));
      }
      await run?.checkpoint();
    } catch (error) {
      failure = error instanceof Error ? error : new Error(String(error));
      break;
    }
  }

  const status = failure ? (rowsMapped ? "partial" : "failed") : "succeeded";
  await run?.finish(status, failure?.message);
  return {
    runId: run?.id ?? null,
    status,
    dryRun: options.dryRun,
    genresRequested: visited.size,
    rowsMapped,
    sample,
    error: failure?.message,
  };
}

async function importProducts(options: ImportOptions) {
  const rakuten = rakutenClientFromEnv();
  const admin = options.dryRun ? null : createAdminClient();
  const seeds = [
    ...options.genreIds.map((value) => ({ type: "genre" as const, value })),
    ...options.keywords.map((value) => ({ type: "keyword" as const, value })),
  ];
  const run = admin
    ? await IngestionRun.start(admin, "local-rakuten-products", {
      genreIds: options.genreIds,
      keywords: options.keywords,
      maxPages: options.maxPages,
    })
    : null;
  const sample: unknown[] = [];
  const warnings: string[] = [];
  let pagesRequested = 0;
  let received = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const seed of seeds) {
    let page = 1;
    let pageCount = 1;
    while (page <= Math.min(pageCount, options.maxPages)) {
      const params: ProductSearchParams = {
        page,
        ...(seed.type === "genre"
          ? { genreId: seed.value }
          : { keyword: seed.value }),
      };
      pagesRequested += 1;
      run && (run.counters.pagesRequested += 1);
      try {
        const response = await rakuten.searchProducts(params);
        pageCount = response.pageCount;
        received += response.products.length;
        run && (run.counters.recordsReceived += response.products.length);
        for (const product of response.products) {
          if (sample.length < 10) {
            sample.push({
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
          } catch (error) {
            skipped += 1;
            run && (run.counters.recordsSkipped += 1);
            warnings.push(
              `${product.productId}: ${
                error instanceof Error ? error.message : error
              }`,
            );
          }
        }
        await run?.checkpoint();
        page += 1;
        if (page <= Math.min(pageCount, options.maxPages)) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch (error) {
        warnings.push(
          `${seed.type} "${seed.value}" page ${page}: ${
            error instanceof Error ? error.message : error
          }`,
        );
        break;
      }
    }
  }

  const completeFailure = received === 0 && warnings.length > 0;
  const status = completeFailure
    ? "failed"
    : warnings.length || skipped
    ? "partial"
    : "succeeded";
  await run?.finish(
    status,
    warnings.length ? warnings.slice(0, 20).join("\n") : undefined,
  );
  return {
    runId: run?.id ?? null,
    status,
    dryRun: options.dryRun,
    pagesRequested,
    recordsReceived: received,
    recordsInserted: inserted,
    recordsUpdated: updated,
    recordsSkipped: skipped,
    sample,
    warnings: warnings.slice(0, 100),
  };
}

export async function runImport(options: ImportOptions) {
  return options.command === "genres"
    ? importGenres(options)
    : importProducts(options);
}

if (import.meta.main) {
  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    console.log(HELP);
  } else {
    try {
      const options = parseImportArgs(Deno.args);
      const result = await runImport(options);
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "failed") Deno.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      Deno.exitCode = 1;
    }
  }
}
