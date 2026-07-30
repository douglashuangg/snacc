import { createAdminClient } from "../_shared/database.ts";
import { PARSER_VERSION } from "../_shared/flavour-taxonomy.ts";
import { parseProductTags } from "../_shared/flavour-parser.ts";
import {
  authorizeAdmin,
  errorResponse,
  jsonResponse,
} from "../_shared/http.ts";
import { IngestionRun } from "../_shared/ingestion-log.ts";
import type { RakutenProduct } from "../_shared/rakuten-types.ts";

interface ReparseInput {
  snackIds?: string[];
  limit?: number;
  dryRun?: boolean;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const unauthorized = authorizeAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const input = await request.json() as ReparseInput;
    const snackIds = Array.isArray(input.snackIds)
      ? [
        ...new Set(input.snackIds.filter((id): id is string =>
          typeof id === "string" && /^[0-9a-f-]{36}$/iu.test(id)
        )),
      ]
      : [];
    const limit = Math.min(
      Math.max(Math.trunc(Number(input.limit ?? 500)), 1),
      1_000,
    );
    const dryRun = input.dryRun === true;
    const admin = createAdminClient();
    let query = admin
      .from("rakuten_product_payloads")
      .select("snack_id,raw_product")
      .limit(limit);
    if (snackIds.length) query = query.in("snack_id", snackIds);
    const { data: payloads, error: fetchError } = await query;
    if (fetchError) throw new Error(fetchError.message);

    const run = dryRun
      ? null
      : await IngestionRun.start(admin, "rakuten-reparse-tags", {
        snackIds,
        limit,
        parserVersion: PARSER_VERSION,
      });
    const sample: unknown[] = [];
    let updated = 0;
    let skipped = 0;

    for (const payload of payloads ?? []) {
      const product = payload.raw_product as RakutenProduct;
      if (!product || typeof product.productId !== "string") {
        skipped += 1;
        run && (run.counters.recordsSkipped += 1);
        continue;
      }
      const tags = parseProductTags(product);
      if (sample.length < 10) {
        sample.push({ snackId: payload.snack_id, tags });
      }
      if (dryRun) continue;
      const { error: deleteError } = await admin
        .from("snack_tags")
        .delete()
        .eq("snack_id", payload.snack_id)
        .eq("is_admin_verified", false);
      if (deleteError) {
        skipped += 1;
        run && (run.counters.recordsSkipped += 1);
        continue;
      }
      if (tags.length) {
        const { error: insertError } = await admin.from("snack_tags").upsert(
          tags.map((tag) => ({ snack_id: payload.snack_id, ...tag })),
          {
            onConflict: "snack_id,tag_type,tag_key,parser_version",
            ignoreDuplicates: true,
          },
        );
        if (insertError) {
          skipped += 1;
          run && (run.counters.recordsSkipped += 1);
          continue;
        }
      }
      updated += 1;
      run && (run.counters.recordsUpdated += 1);
    }

    if (run) {
      run.counters.recordsReceived = payloads?.length ?? 0;
      await run.finish(
        skipped ? "partial" : "succeeded",
        skipped ? `${skipped} rows skipped` : undefined,
      );
    }
    return jsonResponse({
      runId: run?.id ?? null,
      status: skipped ? "partial" : "succeeded",
      dryRun,
      parserVersion: PARSER_VERSION,
      recordsReceived: payloads?.length ?? 0,
      recordsUpdated: updated,
      recordsSkipped: skipped,
      sample,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
