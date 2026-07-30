/**
 * Reject approved Rakuten snacks that lack images or are not food/snacks.
 *
 *   npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local \
 *     --allow-env --allow-net supabase/scripts/rakuten-prune-approved.ts
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  chunk,
  loadGenreContext,
  loadImageBySnack,
  rebuildCards,
  rejectReasonForSnack,
} from "../functions/_shared/rakuten-curation.ts";

async function main() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: approved, error } = await db
    .from("snacks")
    .select("id,name_ja,image_url")
    .eq("source_type", "rakuten")
    .eq("status", "approved");
  if (error) throw error;

  const snacks = approved ?? [];
  const ids = snacks.map((row) => row.id);
  const imageBySnack = await loadImageBySnack(db, ids);
  const { pathBySnack } = await loadGenreContext(db, ids);

  const rejectIds = {
    no_image: [] as string[],
    non_snack: [] as string[],
  };

  for (const snack of snacks) {
    const reason = rejectReasonForSnack(
      snack.id,
      snack.image_url,
      pathBySnack.get(snack.id) ?? "",
      imageBySnack,
    );
    if (reason) rejectIds[reason].push(snack.id);
  }

  const allRejectIds = [...new Set([
    ...rejectIds.no_image,
    ...rejectIds.non_snack,
  ])];

  let rejected = 0;
  for (const batch of chunk(allRejectIds, 100)) {
    const { error: updateError, count } = await db
      .from("snacks")
      .update({ status: "rejected", updated_at: new Date().toISOString() }, {
        count: "exact",
      })
      .in("id", batch)
      .eq("status", "approved");
    if (updateError) throw updateError;
    rejected += count ?? batch.length;
  }

  const cardsRebuilt = await rebuildCards(db);

  console.log(JSON.stringify({
    approvedBefore: snacks.length,
    rejected,
    rejectedNoImage: rejectIds.no_image.length,
    rejectedNonSnack: rejectIds.non_snack.length,
    kept: snacks.length - rejected,
    cardsRebuilt,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  Deno.exit(1);
});
