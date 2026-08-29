const GOOGLE_SUGGEST_URL =
  "https://suggestqueries.google.com/complete/search?client=firefox&q=";

const MAX_KEYWORDS = 20;

function normalizeKeyword(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function stripEtsyPrefix(value: string): string {
  return value.replace(/^etsy\s+/i, "").trim();
}

function buildSeedQueries(subject: string, productType: string): string[] {
  const subjectClean = subject.trim();
  const productClean = productType.trim();
  const productShort =
    productClean === "t-shirt" ? "shirt" : productClean.replace(/\s+/g, " ");

  const seeds = [
    `etsy ${subjectClean}`,
    `etsy ${subjectClean} ${productClean}`,
    `etsy custom ${subjectClean} ${productShort}`,
    `etsy ${subjectClean} gift`,
    `etsy ${subjectClean} ${productShort} gift`,
  ];

  return Array.from(new Set(seeds.map((s) => s.replace(/\s+/g, " ").trim())));
}

function isRelevantSuggestion(
  suggestion: string,
  subject: string,
  productIntent: RegExp
): boolean {
  const normalized = normalizeKeyword(suggestion);
  if (!normalized || normalized.length < 3) return false;
  if (!normalized.includes("etsy")) return false;

  const subjectWords = subject
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const withoutEtsy = stripEtsyPrefix(normalized);
  const hasSubjectWord = subjectWords.some((word) => withoutEtsy.includes(word));
  const hasProductIntent = productIntent.test(withoutEtsy);

  return hasSubjectWord || hasProductIntent;
}

async function fetchGoogleSuggestions(seed: string): Promise<string[]> {
  const url = `${GOOGLE_SUGGEST_URL}${encodeURIComponent(seed)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; EtsyListingGenerator/1.0)",
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Google suggest HTTP ${res.status}`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[1])) {
    return [];
  }

  return data[1]
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Harvest trending Etsy-related search phrases via Google autocomplete.
 * Falls back to an empty array if requests fail.
 */
export async function scanEtsyKeywords(
  subject: string,
  productType: string,
  productIntent: RegExp = /(shirt|tee|t-shirt|hoodie|gift|custom|car|apparel|art|print|merch)/i
): Promise<string[]> {
  const seeds = buildSeedQueries(subject, productType);
  const ranked = new Map<string, { phrase: string; score: number }>();

  const settled = await Promise.allSettled(
    seeds.map(async (seed, i) => {
      const suggestions = await fetchGoogleSuggestions(seed);
      return { seed, i, suggestions };
    })
  );

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      console.warn("[seo-scan] seed failed:", result.reason);
      continue;
    }
    const { i, suggestions } = result.value;
    suggestions.forEach((suggestion, index) => {
      if (!isRelevantSuggestion(suggestion, subject, productIntent)) return;

      const phrase = stripEtsyPrefix(suggestion);
      if (!phrase) return;

      const key = normalizeKeyword(phrase);
      const score = (seeds.length - i) * 10 + Math.max(0, 10 - index);
      const existing = ranked.get(key);
      if (!existing || score > existing.score) {
        ranked.set(key, { phrase, score });
      }
    });
  }

  return Array.from(ranked.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.phrase)
    .slice(0, MAX_KEYWORDS);
}
