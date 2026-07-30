import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const FOOD_PATH_HINTS = [
  "菓子",
  "スナック",
  "チョコ",
  "グミ",
  "ポテト",
  "せんべい",
  "クッキー",
  "駄菓子",
  "チップス",
  "クラッカー",
  "ビスケット",
  "和菓子",
  "洋菓子",
  "キャンディ",
  "飴",
  "あんみつ",
  "ゼリー",
  "プリン",
  "ケーキ",
  "ドーナツ",
  "ポップコーン",
  "ナッツ",
  "ドライフルーツ",
  "おつまみ",
] as const;

export const JUNK_PATH_HINTS = [
  "ファッション",
  "バッグ",
  "靴",
  "腕時計",
  "ジュエリー",
  "キッズ・ベビー",
  "ベビー",
  "おもちゃ",
  "インナー",
  "スーツケース",
  "トップス",
  "絵本",
  "家電",
  "スマホ",
  "ゲーム",
  "CD",
  "DVD",
  "カラコン",
  "サークルレンズ",
  "スタイ",
  "マーカー",
  "サインペン",
  "消しゴム",
  "ストラップ",
  "マスコット",
  "ソルトミル",
  "ベビーチェア",
  "韓国",
  "K-POP",
  "輸入盤",
  "アルバム",
  "文房具",
  "コスメ",
  "コンタクト",
  // Kitchen tooling that matches FOOD's "クッキー" substring otherwise
  "クッキー型",
  "クッキーカッター",
  "cookie cutter",
  "型抜き",
] as const;

export type RejectReason = "no_image" | "non_snack";

export interface RakutenGenreRow {
  genre_id: string;
  name_ja: string;
  path_ja: string[] | null;
}

export interface SnackImageRow {
  snack_id: string;
  image_url: string;
  is_primary: boolean;
  position: number;
}

export function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trim();
}

export function priceLevel(minJpy: number | null | undefined): 1 | 2 | 3 {
  if (minJpy == null || minJpy < 500) return 1;
  if (minJpy < 1500) return 2;
  return 3;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function genrePathText(genre: Pick<RakutenGenreRow, "name_ja" | "path_ja">): string {
  return [...(genre.path_ja ?? []), genre.name_ja ?? ""]
    .filter(Boolean)
    .join("/");
}

export function hasJunkHint(text: string): boolean {
  const lower = text.toLowerCase();
  return JUNK_PATH_HINTS.some((hint) => lower.includes(hint.toLowerCase()));
}

export function isFoodGenre(pathText: string): boolean {
  if (hasJunkHint(pathText)) return false;
  return FOOD_PATH_HINTS.some((hint) => pathText.includes(hint));
}

export function hasSnackImage(
  snackId: string,
  imageUrl: string | null | undefined,
  imageBySnack: Map<string, string>,
): boolean {
  return Boolean(imageUrl?.trim() || imageBySnack.get(snackId));
}

export function rejectReasonForSnack(
  snackId: string,
  imageUrl: string | null | undefined,
  pathText: string,
  imageBySnack: Map<string, string>,
  productText = "",
): RejectReason | null {
  if (!hasSnackImage(snackId, imageUrl, imageBySnack)) return "no_image";
  if (hasJunkHint(productText) || !isFoodGenre(pathText)) return "non_snack";
  return null;
}

export function buildImageBySnack(images: SnackImageRow[]): Map<string, string> {
  const imageBySnack = new Map<string, string>();
  for (const image of images) {
    if (!imageBySnack.has(image.snack_id) || image.is_primary) {
      imageBySnack.set(image.snack_id, image.image_url);
    }
  }
  return imageBySnack;
}

export async function loadGenreContext(
  db: SupabaseClient,
  snackIds: string[],
): Promise<{
  pathBySnack: Map<string, string>;
  primaryGenreBySnack: Map<string, string>;
  genreById: Map<string, RakutenGenreRow>;
}> {
  const pathBySnack = new Map<string, string>();
  const primaryGenreBySnack = new Map<string, string>();
  const genreById = new Map<string, RakutenGenreRow>();

  if (!snackIds.length) {
    return { pathBySnack, primaryGenreBySnack, genreById };
  }

  const { data: links, error: linkError } = await db
    .from("snack_rakuten_genres")
    .select("snack_id,genre_id,is_primary")
    .in("snack_id", snackIds);
  if (linkError) throw linkError;

  const genreIds = [...new Set((links ?? []).map((row) => row.genre_id))];
  if (genreIds.length) {
    const { data: genres, error: genreError } = await db
      .from("rakuten_genres")
      .select("genre_id,name_ja,path_ja")
      .in("genre_id", genreIds);
    if (genreError) throw genreError;
    for (const genre of genres ?? []) {
      genreById.set(genre.genre_id, genre as RakutenGenreRow);
    }
  }

  for (const link of links ?? []) {
    const genre = genreById.get(link.genre_id);
    const path = genre ? genrePathText(genre) : "";
    pathBySnack.set(
      link.snack_id,
      `${pathBySnack.get(link.snack_id) ?? ""} ${path}`.trim(),
    );
    const existing = primaryGenreBySnack.get(link.snack_id);
    if (!existing || link.is_primary) {
      primaryGenreBySnack.set(link.snack_id, link.genre_id);
    }
  }

  return { pathBySnack, primaryGenreBySnack, genreById };
}

export async function loadImageBySnack(
  db: SupabaseClient,
  snackIds: string[],
): Promise<Map<string, string>> {
  if (!snackIds.length) return new Map();

  const { data: images, error } = await db
    .from("snack_images")
    .select("snack_id,image_url,is_primary,position")
    .in("snack_id", snackIds)
    .order("position", { ascending: true });
  if (error) throw error;

  return buildImageBySnack((images ?? []) as SnackImageRow[]);
}

export async function rebuildCards(db: SupabaseClient): Promise<number> {
  const { data: approved, error } = await db
    .from("snacks")
    .select("id,name_ja,brand,maker_name,image_url")
    .eq("source_type", "rakuten")
    .eq("status", "approved");
  if (error) throw error;

  const ids = (approved ?? []).map((row) => row.id);
  if (!ids.length) {
    await db.from("rakuten_snack_cards").delete().neq(
      "snack_id",
      "00000000-0000-0000-0000-000000000000",
    );
    return 0;
  }

  const { primaryGenreBySnack, genreById } = await loadGenreContext(db, ids);
  const imageBySnack = await loadImageBySnack(db, ids);

  const now = new Date().toISOString();
  const rows = (approved ?? []).map((snack) => {
    const genreId = primaryGenreBySnack.get(snack.id) ?? null;
    const genre = genreId ? genreById.get(genreId) : null;
    return {
      snack_id: snack.id,
      name_ja: snack.name_ja,
      brand: clip(
        String(snack.maker_name || snack.brand || "").trim() || "Unknown",
        80,
      ),
      image_url: snack.image_url || imageBySnack.get(snack.id) || null,
      genre_id: genreId,
      genre_name: genre?.name_ja ?? null,
      genre_path: genre?.path_ja ?? null,
      updated_at: now,
    };
  });

  for (const batch of chunk(rows, 100)) {
    const { error: upsertError } = await db
      .from("rakuten_snack_cards")
      .upsert(batch, { onConflict: "snack_id" });
    if (upsertError) throw upsertError;
  }

  const { data: existingCards, error: listError } = await db
    .from("rakuten_snack_cards")
    .select("snack_id");
  if (listError) throw listError;

  const approvedIds = new Set(ids);
  const staleIds = (existingCards ?? [])
    .map((row) => row.snack_id as string)
    .filter((snackId) => !approvedIds.has(snackId));

  for (const batch of chunk(staleIds, 100)) {
    const { error: deleteError } = await db
      .from("rakuten_snack_cards")
      .delete()
      .in("snack_id", batch);
    if (deleteError) throw deleteError;
  }

  return rows.length;
}
