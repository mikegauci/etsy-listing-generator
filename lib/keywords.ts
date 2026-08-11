import type { KeywordStat, ShopListing } from "./types";
import { SHOP_LISTING_COLUMNS } from "./shop-listings";
import { scoreAgainstSubject, tokenizeSubject } from "./scoring";
import type { SupabaseClient } from "@supabase/supabase-js";

export function tokenizeTitle(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  const phrases: string[] = [];
  for (let i = 0; i < words.length; i++) {
    phrases.push(words[i]);
    if (i + 1 < words.length) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }
  }
  return phrases;
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "this",
  "that",
  "gift",
  "men",
  "women",
  "unisex",
]);

export function computeKeywordStats(listings: ShopListing[]): {
  tags: KeywordStat[];
  titlePhrases: KeywordStat[];
} {
  const tagMap = new Map<string, KeywordStat>();
  const titleMap = new Map<string, KeywordStat>();

  for (const listing of listings) {
    const weightViews = listing.views || 0;
    const weightFavs = listing.num_favorers || 0;

    for (const raw of listing.tags || []) {
      const term = raw.toLowerCase().trim();
      if (!term) continue;
      const cur = tagMap.get(term) || {
        term,
        count: 0,
        totalViews: 0,
        totalFavorers: 0,
        score: 0,
      };
      cur.count += 1;
      cur.totalViews += weightViews;
      cur.totalFavorers += weightFavs;
      cur.score = cur.totalViews + cur.totalFavorers * 5;
      tagMap.set(term, cur);
    }

    for (const phrase of tokenizeTitle(listing.title || "")) {
      const cur = titleMap.get(phrase) || {
        term: phrase,
        count: 0,
        totalViews: 0,
        totalFavorers: 0,
        score: 0,
      };
      cur.count += 1;
      cur.totalViews += weightViews;
      cur.totalFavorers += weightFavs;
      cur.score = cur.totalViews + cur.totalFavorers * 5;
      titleMap.set(phrase, cur);
    }
  }

  const sortDesc = (a: KeywordStat, b: KeywordStat) => b.score - a.score;

  return {
    tags: Array.from(tagMap.values()).sort(sortDesc).slice(0, 40),
    titlePhrases: Array.from(titleMap.values()).sort(sortDesc).slice(0, 40),
  };
}

export async function findRelevantListings(
  supabase: SupabaseClient,
  subject: string,
  productType: string,
  limit = 12
): Promise<ShopListing[]> {
  const subjectTokens = tokenizeSubject(subject);
  const productTokens = productType
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const { data, error } = await supabase
    .from("shop_listings")
    .select(SHOP_LISTING_COLUMNS)
    .eq("state", "active")
    .order("views", { ascending: false })
    .limit(120);

  if (error) {
    console.error("findRelevantListings", error);
    return [];
  }

  const rows = (data || []) as ShopListing[];

  const scored = rows
    .map((row) => {
      const { score, nicheHit } = scoreAgainstSubject(row, subjectTokens, {
        productTokens,
      });
      const boosted = score + (row.state === "active" ? 50 : 0);
      return { row, score: boosted, nicheHit };
    })
    .sort((a, b) => b.score - a.score);

  const niche = scored.filter((s) => s.nicheHit).slice(0, limit);
  if (niche.length >= Math.min(4, limit)) {
    return niche.map((s) => s.row);
  }

  const rest = scored
    .filter((s) => !s.nicheHit)
    .slice(0, limit - niche.length);
  return [...niche, ...rest].map((s) => s.row);
}
