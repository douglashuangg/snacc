export const PARSER_VERSION = "ja-snacks-v1";

export type TagType = "flavour" | "taste" | "texture" | "dietary" | "other";

export interface TaxonomyEntry {
  tagKey: string;
  displayName: string;
  tagType: TagType;
  terms: string[];
  patterns?: RegExp[];
  implied?: Array<
    {
      tagKey: string;
      displayName: string;
      tagType: TagType;
      confidence: number;
    }
  >;
}

export const SNACK_TAXONOMY: TaxonomyEntry[] = [
  {
    tagKey: "matcha",
    displayName: "Matcha",
    tagType: "flavour",
    terms: ["抹茶"],
  },
  {
    tagKey: "strawberry",
    displayName: "Strawberry",
    tagType: "flavour",
    terms: ["いちご", "苺"],
  },
  {
    tagKey: "seaweed-salt",
    displayName: "Seaweed Salt",
    tagType: "flavour",
    terms: ["のりしお", "海苔塩"],
  },
  {
    tagKey: "plum",
    displayName: "Plum",
    tagType: "flavour",
    terms: ["梅味", "梅風味"],
  },
  {
    tagKey: "wasabi",
    displayName: "Wasabi",
    tagType: "flavour",
    terms: ["わさび", "山葵"],
    implied: [{
      tagKey: "spicy",
      displayName: "Spicy",
      tagType: "taste",
      confidence: 0.55,
    }],
  },
  {
    tagKey: "cheese",
    displayName: "Cheese",
    tagType: "flavour",
    terms: ["チーズ"],
  },
  {
    tagKey: "chocolate",
    displayName: "Chocolate",
    tagType: "flavour",
    terms: ["チョコレート", "チョコ"],
  },
  {
    tagKey: "sweet",
    displayName: "Sweet",
    tagType: "taste",
    terms: ["甘い", "甘口"],
  },
  {
    tagKey: "spicy",
    displayName: "Spicy",
    tagType: "taste",
    terms: ["辛い", "辛口"],
    patterns: [/激辛/gu],
  },
  {
    tagKey: "sour",
    displayName: "Sour",
    tagType: "taste",
    terms: ["酸っぱい", "すっぱい"],
  },
  {
    tagKey: "salty",
    displayName: "Salty",
    tagType: "taste",
    terms: ["しょっぱい", "塩味"],
  },
  {
    tagKey: "crispy",
    displayName: "Crispy",
    tagType: "texture",
    terms: ["サクサク", "さくさく"],
  },
  {
    tagKey: "crunchy",
    displayName: "Crunchy",
    tagType: "texture",
    terms: ["カリカリ", "かりかり"],
  },
  {
    tagKey: "chewy",
    displayName: "Chewy",
    tagType: "texture",
    terms: ["もちもち", "モチモチ"],
  },
  {
    tagKey: "soft-fluffy",
    displayName: "Soft & Fluffy",
    tagType: "texture",
    terms: ["ふわふわ", "フワフワ"],
  },
];
