const MARKETPLACE_NOISE = [
  /送料無料/gu,
  /まとめ買い/gu,
  /ランキング(?:入賞)?/gu,
  /ポイント\d+倍/gu,
];

export function normalizeJapaneseText(
  input: string | null | undefined,
): string {
  if (!input) return "";
  return MARKETPLACE_NOISE.reduce(
    (value, pattern) => value.replace(pattern, " "),
    input.normalize("NFKC").toLowerCase().replace(/<[^>]*>/gu, " "),
  )
    .replace(/[【】[\]（）()「」『』]/gu, " ")
    .replace(/[\u3000\s]+/gu, " ")
    .trim();
}

export function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function nullableInt(value: unknown): number | null {
  const parsed = nullableNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

export function parseRakutenDate(value: unknown): string | null {
  const text = nullableText(value);
  if (!text) return null;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/u);
  const separated = text.match(/^(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?$/u);
  const match = compact ?? separated;
  if (!match) return null;
  const result = `${match[1]}-${match[2].padStart(2, "0")}-${
    match[3].padStart(2, "0")
  }`;
  return Number.isNaN(Date.parse(`${result}T00:00:00Z`)) ? null : result;
}

export interface PackageEvidence {
  packageSizeText: string | null;
  unitCount: number | null;
}

export function extractPackageEvidence(
  input: string | null | undefined,
): PackageEvidence {
  if (!input) return { packageSizeText: null, unitCount: null };
  const normalized = input.normalize("NFKC");
  const weight = normalized.match(/\b\d+(?:\.\d+)?\s?(?:g|kg|ml|l)\b/iu);
  const units = normalized.match(
    /(?:×|x)?\s?(\d{1,3})\s?(?:個|袋|枚|本|箱|パック|packs?)/iu,
  );
  const setUnits = normalized.match(/(\d{1,3})\s?(?:個|袋|枚|本|箱)入/iu);
  const unitCount = Number(units?.[1] ?? setUnits?.[1]);
  const evidence = [weight?.[0], units?.[0] ?? setUnits?.[0]].filter(Boolean)
    .join(" ");
  return {
    packageSizeText: evidence || null,
    unitCount: Number.isInteger(unitCount) && unitCount > 0 ? unitCount : null,
  };
}
