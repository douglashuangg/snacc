import {
  PARSER_VERSION,
  SNACK_TAXONOMY,
  type TagType,
} from "./flavour-taxonomy.ts";
import type { RakutenProduct } from "./rakuten-types.ts";

export interface ParsedTag {
  tag_type: TagType;
  tag_key: string;
  display_name: string;
  confidence: number;
  source_field: string;
  evidence_text: string;
  parser_version: string;
}

interface SourceText {
  field: string;
  text: string;
  confidence: number;
}

function productSources(product: RakutenProduct): SourceText[] {
  const sources: SourceText[] = [];
  if (product.productName) {
    sources.push({
      field: "productName",
      text: product.productName,
      confidence: 0.95,
    });
  }
  for (const detail of product.detail ?? []) {
    if (detail && typeof detail.value === "string") {
      sources.push({
        field: `detail.${detail.name || "value"}`,
        text: detail.value,
        confidence: 0.9,
      });
    }
  }
  if (product.productCaption) {
    sources.push({
      field: "productCaption",
      text: product.productCaption,
      confidence: 0.75,
    });
  }
  return sources;
}

function evidenceFor(
  text: string,
  terms: string[],
  patterns: RegExp[],
): string | null {
  for (const term of terms) {
    if (text.includes(term)) return term;
  }
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
}

export function parseProductTags(product: RakutenProduct): ParsedTag[] {
  const found = new Map<string, ParsedTag>();

  for (const source of productSources(product)) {
    const normalized = source.text.normalize("NFKC");
    for (const entry of SNACK_TAXONOMY) {
      const evidence = evidenceFor(
        normalized,
        entry.terms,
        entry.patterns ?? [],
      );
      if (!evidence) continue;

      const key = `${entry.tagType}:${entry.tagKey}`;
      const tag: ParsedTag = {
        tag_type: entry.tagType,
        tag_key: entry.tagKey,
        display_name: entry.displayName,
        confidence: source.confidence,
        source_field: source.field,
        evidence_text: evidence,
        parser_version: PARSER_VERSION,
      };
      if (!found.has(key) || found.get(key)!.confidence < tag.confidence) {
        found.set(key, tag);
      }

      for (const implied of entry.implied ?? []) {
        const impliedKey = `${implied.tagType}:${implied.tagKey}`;
        const impliedTag: ParsedTag = {
          tag_type: implied.tagType,
          tag_key: implied.tagKey,
          display_name: implied.displayName,
          confidence: Math.min(source.confidence, implied.confidence),
          source_field: `${source.field}:semantic_implication`,
          evidence_text: evidence,
          parser_version: PARSER_VERSION,
        };
        if (
          !found.has(impliedKey) ||
          found.get(impliedKey)!.confidence < impliedTag.confidence
        ) {
          found.set(impliedKey, impliedTag);
        }
      }
    }
  }

  return [...found.values()];
}
