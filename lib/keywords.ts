import type { KeywordStat, ShopListing } from "./types";

function tokenizeTitle(title: string): string[] {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  subject: string,
  productType: string,
  limit = 12
): Promise<ShopListing[]> {
  const subjectTokens = subject
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 1)
    .slice(0, 6);
  const productTokens = productType
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const { data, error } = await supabase
    .from("shop_listings")
    .select(
      "id, etsy_listing_id, title, tags, description, views, num_favorers, taxonomy_path, category, price_amount, price_currency, state, url, synced_at"
    )
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
      const hay =
        `${row.title} ${(row.tags || []).join(" ")} ${row.description || ""} ${row.category || ""}`.toLowerCase();
      let score = (row.views || 0) * 0.01 + (row.num_favorers || 0) * 0.05;

      // Niche subject match (e.g. Ford, Mustang) — highest weight
      for (const t of subjectTokens) {
        if (hay.includes(t)) score += 2000;
        if ((row.title || "").toLowerCase().includes(t)) score += 1500;
      }

      for (const t of productTokens) {
        if (hay.includes(t)) score += 400;
      }

      // Prefer active catalog performers as style templates even without niche hit
      if (row.state === "active") score += 50;

      return { row, score, nicheHit: subjectTokens.some((t) => hay.includes(t)) };
    })
    .sort((a, b) => b.score - a.score);

  const niche = scored.filter((s) => s.nicheHit).slice(0, limit);
  if (niche.length >= Math.min(4, limit)) {
    return niche.map((s) => s.row);
  }

  // Mix niche hits with top product-type / overall performers as title templates
  const rest = scored
    .filter((s) => !s.nicheHit)
    .slice(0, limit - niche.length);
  return [...niche, ...rest].map((s) => s.row);
}
