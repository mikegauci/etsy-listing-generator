const GOOGLE_SUGGEST_URL =
  "https://suggestqueries.google.com/complete/search?client=firefox&q=";

const REQUEST_DELAY_MS = 300;
const MAX_KEYWORDS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function isRelevantSuggestion(suggestion: string, subject: string): boolean {
  const normalized = normalizeKeyword(suggestion);
  if (!normalized || normalized.length < 3) return false;
  if (!normalized.includes("etsy")) return false;

  const subjectWords = subject
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const withoutEtsy = stripEtsyPrefix(normalized);
  const hasSubjectWord = subjectWords.some((word) => withoutEtsy.includes(word));
  const hasProductIntent =
    /(shirt|tee|t-shirt|hoodie|gift|custom|car|apparel|art|print|merch)/i.test(
      withoutEtsy
    );

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
  productType: string
): Promise<string[]> {
  const seeds = buildSeedQueries(subject, productType);
  const ranked = new Map<string, { phrase: string; score: number }>();

  for (let i = 0; i < seeds.length; i += 1) {
    const seed = seeds[i];
    try {
      const suggestions = await fetchGoogleSuggestions(seed);
      suggestions.forEach((suggestion, index) => {
        if (!isRelevantSuggestion(suggestion, subject)) return;

        const phrase = stripEtsyPrefix(suggestion);
        if (!phrase) return;

        const key = normalizeKeyword(phrase);
        const score = (seeds.length - i) * 10 + Math.max(0, 10 - index);
        const existing = ranked.get(key);
        if (!existing || score > existing.score) {
          ranked.set(key, { phrase, score });
        }
      });
    } catch (err) {
      console.warn("[seo-scan] seed failed:", seed, err);
    }

    if (i < seeds.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return Array.from(ranked.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.phrase)
    .slice(0, MAX_KEYWORDS);
}
