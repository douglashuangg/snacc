import type { RakutenGenreResponse } from "./rakuten-types.ts";

export interface MappedGenre {
  genre_id: string;
  name_ja: string;
  level: number;
  parent_genre_id: string | null;
  path_ja: string[];
  raw_genre: Record<string, unknown>;
  updated_at: string;
}

export function mapGenreResponse(
  response: RakutenGenreResponse,
  now = new Date(),
): MappedGenre[] {
  const chain = [...response.ancestors, response.genre];
  const updatedAt = now.toISOString();
  const byId = new Map<string, MappedGenre>();

  chain.forEach((genre, index) => {
    byId.set(genre.genreId, {
      genre_id: genre.genreId,
      name_ja: genre.nameJa,
      level: genre.level,
      parent_genre_id: index > 0 ? chain[index - 1]?.genreId ?? null : null,
      path_ja: chain.slice(0, index + 1).map((item) => item.nameJa),
      raw_genre: { ...genre },
      updated_at: updatedAt,
    });
  });

  for (const child of response.children) {
    byId.set(child.genreId, {
      genre_id: child.genreId,
      name_ja: child.nameJa,
      level: child.level,
      parent_genre_id: response.genre.genreId,
      path_ja: [...chain.map((item) => item.nameJa), child.nameJa],
      raw_genre: { ...child },
      updated_at: updatedAt,
    });
  }

  return [...byId.values()];
}
