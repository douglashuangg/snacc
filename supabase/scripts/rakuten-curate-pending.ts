/**
 * Approve pending Rakuten snacks that have images and food genres, then rebuild cards.
 *
 *   npx -y deno run --config=supabase/deno.json --env-file=supabase/.env.local \
 *     --allow-env --allow-net supabase/scripts/rakuten-curate-pending.ts
 *
 * Pass --known-only to also require a known snack maker name.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  clip,
  loadGenreContext,
  loadImageBySnack,
  priceLevel,
  rebuildCards,
  rejectReasonForSnack,
} from "../functions/_shared/rakuten-curation.ts";

const KNOWN_MAKERS = [
  "カルビー",
  "明治",
  "江崎グリコ",
  "グリコ",
  "湖池屋",
  "ヤマザキ",
  "森永",
  "ロッテ",
  "ブルボン",
  "カバヤ",
  "ノーベル",
  "味源",
  "大阪前田",
  "前田製菓",
  "伊藤久右衛門",
  "フランツ",
  "創健社",
  "ノースカラーズ",
  "UHA味覚糖",
  "味覚糖",
  "でん六",
  "亀田製菓",
  "旺旺",
  "おやつカンパニー",
] as const;

async function main() {
  const knownOnly = Deno.args.includes("--known-only");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subcategory, error: subError } = await db
    .from("subcategories")
    .select("id")
    .eq("slug", "snacks")
    .maybeSingle();
  if (subError) throw subError;
  if (!subcategory?.id) {
    throw new Error('Missing subcategory with slug "snacks"');
  }

  const { data: pending, error: pendingError } = await db
    .from("snacks")
    .select(
      "id,name_ja,brand,maker_name,price_min_jpy,product_name,flavour,image_url",
    )
    .eq("source_type", "rakuten")
    .eq("status", "pending");
  if (pendingError) throw pendingError;

  const ids = (pending ?? []).map((row) => row.id);
  const imageBySnack = await loadImageBySnack(db, ids);
  const { pathBySnack } = await loadGenreContext(db, ids);

  const { data: tags, error: tagError } = ids.length
    ? await db
      .from("snack_tags")
      .select("snack_id,tag_type,display_name,evidence_text,confidence")
      .in("snack_id", ids)
      .order("confidence", { ascending: false })
    : { data: [], error: null };
  if (tagError) throw tagError;

  const flavourBySnack = new Map<string, string>();
  for (const tag of tags ?? []) {
    if (flavourBySnack.has(tag.snack_id)) continue;
    if (tag.tag_type === "flavour" || tag.tag_type === "taste") {
      const label = clip(
        String(tag.evidence_text || tag.display_name || "未分類"),
        120,
      );
      if (label) flavourBySnack.set(tag.snack_id, label);
    }
  }

  let skippedNoImage = 0;
  let skippedNonSnack = 0;
  let skippedUnknownMaker = 0;
  let approved = 0;
  const failures: string[] = [];

  for (const snack of pending ?? []) {
    const pathText = pathBySnack.get(snack.id) ?? "";
    const rejectReason = rejectReasonForSnack(
      snack.id,
      snack.image_url,
      pathText,
      imageBySnack,
      snack.name_ja ?? "",
    );
    if (rejectReason === "no_image") {
      skippedNoImage += 1;
      continue;
    }
    if (rejectReason === "non_snack") {
      skippedNonSnack += 1;
      continue;
    }

    if (knownOnly) {
      const blob = `${snack.name_ja ?? ""} ${snack.maker_name ?? ""} ${snack.brand ?? ""}`;
      if (!KNOWN_MAKERS.some((maker) => blob.includes(maker))) {
        skippedUnknownMaker += 1;
        continue;
      }
    }

    const brand = clip(
      String(snack.maker_name || snack.brand || "Unknown").trim() || "Unknown",
      80,
    );
    const productName = clip(
      String(snack.name_ja || snack.product_name || "Untitled snack").trim() ||
        "Untitled snack",
      120,
    );
    const flavour = flavourBySnack.get(snack.id) ?? "未分類";
    const imageUrl = snack.image_url || imageBySnack.get(snack.id) || null;

    const { error } = await db
      .from("snacks")
      .update({
        brand,
        product_name: productName,
        flavour,
        subcategory_id: subcategory.id,
        price_level: priceLevel(snack.price_min_jpy),
        image_url: imageUrl,
        origin_status: "likely_japanese",
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", snack.id)
      .eq("status", "pending");

    if (error) {
      failures.push(`${snack.id}: ${error.message}`);
      continue;
    }
    approved += 1;
  }

  const cardsRebuilt = await rebuildCards(db);

  console.log(JSON.stringify({
    mode: knownOnly ? "known-only" : "food-with-image",
    pendingBefore: pending?.length ?? 0,
    approved,
    skippedNoImage,
    skippedNonSnack,
    skippedUnknownMaker,
    cardsRebuilt,
    failures: failures.slice(0, 15),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  Deno.exit(1);
});
