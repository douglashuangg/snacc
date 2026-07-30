import { createAdminClient } from "../_shared/database.ts";
import { mapGenreResponse } from "../_shared/genre-mapper.ts";
import {
  authorizeAdmin,
  errorResponse,
  jsonResponse,
} from "../_shared/http.ts";
import { IngestionRun } from "../_shared/ingestion-log.ts";
import { rakutenClientFromEnv } from "../_shared/rakuten-client.ts";
import type { RakutenGenre } from "../_shared/rakuten-types.ts";

interface SyncGenresInput {
  genreIds?: string[];
  recursiveDepth?: number;
  maxGenres?: number;
  dryRun?: boolean;
}

function validGenreIds(value: unknown): string[] {
  return Array.isArray(value)
    ? [
      ...new Set(value.filter((item): item is string =>
        typeof item === "string" && /^\d+$/u.test(item)
      )),
    ]
    : [];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const unauthorized = authorizeAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const input = await request.json() as SyncGenresInput;
    const initialIds = validGenreIds(input.genreIds);
    const genreIds = initialIds.length ? initialIds : ["0"];
    const recursiveDepth = Math.min(
      Math.max(Number(input.recursiveDepth ?? 1), 0),
      8,
    );
    const maxGenres = Math.min(
      Math.max(Number(input.maxGenres ?? 250), 1),
      1_000,
    );
    const dryRun = input.dryRun === true;
    const client = rakutenClientFromEnv();
    const admin = dryRun ? null : createAdminClient();
    const run = admin
      ? await IngestionRun.start(admin, "rakuten-sync-genres", {
        genreIds,
        recursiveDepth,
        maxGenres,
      })
      : null;
    const queue = genreIds.map((genreId) => ({ genreId, depth: 0 }));
    const visited = new Set<string>();
    const samples: unknown[] = [];
    let stored = 0;
    let failure: Error | null = null;

    while (queue.length && visited.size < maxGenres) {
      const next = queue.shift()!;
      if (visited.has(next.genreId)) continue;
      visited.add(next.genreId);
      try {
        const response = await client.searchGenre(next.genreId);
        run && (run.counters.pagesRequested += 1);
        const rows = mapGenreResponse(response);
        if (samples.length < 10) {
          samples.push(...rows.slice(0, 10 - samples.length));
        }
        if (admin) {
          const genreRowIds = rows.map((row) => String(row.genre_id));
          const { data: existing, error: existingError } = await admin
            .from("rakuten_genres")
            .select("genre_id")
            .in("genre_id", genreRowIds);
          if (existingError) throw new Error(existingError.message);
          const { error } = await admin.from("rakuten_genres").upsert(rows, {
            onConflict: "genre_id",
          });
          if (error) throw new Error(error.message);
          const existingCount = existing?.length ?? 0;
          if (run) {
            run.counters.recordsInserted += rows.length - existingCount;
            run.counters.recordsUpdated += existingCount;
          }
        }
        stored += rows.length;
        run && (run.counters.recordsReceived += rows.length);
        if (next.depth < recursiveDepth) {
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

    if (run) {
      await run.finish(
        failure ? (stored ? "partial" : "failed") : "succeeded",
        failure?.message,
      );
    }
    return jsonResponse({
      runId: run?.id ?? null,
      status: failure ? (stored ? "partial" : "failed") : "succeeded",
      dryRun,
      genresRequested: visited.size,
      rowsMapped: stored,
      sample: samples,
      error: failure?.message,
    }, failure && !stored ? 502 : 200);
  } catch (error) {
    return errorResponse(error);
  }
});
