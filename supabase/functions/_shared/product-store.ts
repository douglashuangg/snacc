import type { AdminClient } from "./database.ts";
import { parseProductTags } from "./flavour-parser.ts";
import { initialDisplayFields, mapRakutenProduct } from "./product-mapper.ts";
import type { RakutenProduct } from "./rakuten-types.ts";

export interface StoreProductResult {
  snackId: string;
  action: "inserted" | "updated";
  janConflict: boolean;
  tagCount: number;
}

export async function storeRakutenProduct(
  client: AdminClient,
  product: RakutenProduct,
  discovery: {
    type: "genre" | "keyword" | "product_id" | "jan";
    value: string;
  },
): Promise<StoreProductResult> {
  const mapped = mapRakutenProduct(product);
  const { data: existing, error: findError } = await client
    .from("snacks")
    .select("id,status")
    .eq("rakuten_product_id", product.productId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  let snackId: string;
  let action: "inserted" | "updated";
  if (existing) {
    const { data, error } = await client
      .from("snacks")
      .update(mapped)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    snackId = data.id;
    action = "updated";
  } else {
    const display = initialDisplayFields(product);
    const { data, error } = await client
      .from("snacks")
      .insert({
        ...mapped,
        ...display,
        status: "pending",
        source_first_seen_at: mapped.source_last_seen_at,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    snackId = data.id;
    action = "inserted";
  }

  const { error: payloadError } = await client.from("rakuten_product_payloads")
    .upsert({
      snack_id: snackId,
      raw_product: product,
      updated_at: new Date().toISOString(),
    }, { onConflict: "snack_id" });
  if (payloadError) throw new Error(payloadError.message);

  let janConflict = false;
  if (mapped.jan_code) {
    const { data: conflicts, error } = await client
      .from("snacks")
      .select("id")
      .eq("jan_code", mapped.jan_code)
      .neq("id", snackId);
    if (error) throw new Error(error.message);
    if (conflicts?.length) {
      janConflict = true;
      const { error: conflictError } = await client.from(
        "rakuten_ingestion_conflicts",
      ).insert({
        conflict_type: "jan_code",
        rakuten_product_id: product.productId,
        existing_snack_ids: conflicts.map((row) => row.id),
        incoming_payload: product,
      });
      if (conflictError) throw new Error(conflictError.message);
    }
  }

  if (product.mediumImageUrl) {
    const { error: clearError } = await client
      .from("snack_images")
      .update({ is_primary: false })
      .eq("snack_id", snackId)
      .eq("is_primary", true);
    if (clearError) throw new Error(clearError.message);
    const { error } = await client.from("snack_images").upsert({
      snack_id: snackId,
      image_url: product.mediumImageUrl,
      source_api: "product_search",
      source_key: product.productId,
      position: 0,
      is_primary: true,
    }, { onConflict: "snack_id,image_url" });
    if (error) throw new Error(error.message);
  }

  if (product.genreId) {
    const genreName = product.genreName?.trim() || product.genreId;
    const { error: genreError } = await client.from("rakuten_genres").upsert({
      genre_id: product.genreId,
      name_ja: genreName,
      level: 0,
      path_ja: [genreName],
      raw_genre: { genreId: product.genreId, nameJa: product.genreName },
      updated_at: new Date().toISOString(),
    }, { onConflict: "genre_id", ignoreDuplicates: true });
    if (genreError) throw new Error(genreError.message);
    const { error: clearGenreError } = await client
      .from("snack_rakuten_genres")
      .update({ is_primary: false })
      .eq("snack_id", snackId)
      .eq("is_primary", true);
    if (clearGenreError) throw new Error(clearGenreError.message);
    const { error: linkError } = await client.from("snack_rakuten_genres")
      .upsert({
        snack_id: snackId,
        genre_id: product.genreId,
        is_primary: true,
      }, { onConflict: "snack_id,genre_id" });
    if (linkError) throw new Error(linkError.message);
  }

  const tags = parseProductTags(product);
  const { error: deleteError } = await client
    .from("snack_tags")
    .delete()
    .eq("snack_id", snackId)
    .eq("is_admin_verified", false);
  if (deleteError) throw new Error(deleteError.message);
  if (tags.length) {
    const { error } = await client.from("snack_tags").upsert(
      tags.map((tag) => ({ snack_id: snackId, ...tag })),
      {
        onConflict: "snack_id,tag_type,tag_key,parser_version",
        ignoreDuplicates: true,
      },
    );
    if (error) throw new Error(error.message);
  }

  const { error: discoveryError } = await client.from(
    "rakuten_product_discoveries",
  ).upsert({
    snack_id: snackId,
    seed_type: discovery.type,
    seed_value: discovery.value,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "snack_id,seed_type,seed_value" });
  if (discoveryError) throw new Error(discoveryError.message);

  return { snackId, action, janConflict, tagCount: tags.length };
}
