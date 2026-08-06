/** eRank-style SEO: mirror title phrases AND individual title words into tags. */

import {
  buildListingTags,
  clampEtsyTag,
  ETSY_TAG_COUNT as TAG_COUNT,
  ETSY_TAG_MAX_CHARS,
  isEvergreenTag,
} from "./tags";
import { isRecipientKeywordDump } from "./listing-title";

export const ETSY_TAG_MAX = ETSY_TAG_MAX_CHARS;
export const ETSY_TAG_COUNT = TAG_COUNT;
export const ETSY_TITLE_MAX = 140;
/** Soft floor — prefer closer to 14 words / useful trait coverage. */
export const ETSY_TITLE_SOFT_MIN_WORDS = 10;
export const ETSY_TITLE_TARGET_WORDS = 14;

const SKIP_WORDS = new Set([
  "a",
  "an",
  "and",
  "custom",
  "for",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

/** Treat common apparel variants as covering each other. */
const WORD_ALIASES: Record<string, string[]> = {
  "t-shirt": ["tshirt", "shirt", "tee"],
  tshirt: ["t-shirt", "shirt", "tee"],
  shirt: ["t-shirt", "tshirt", "tee"],
  tee: ["t-shirt", "tshirt", "shirt"],
  men: ["him", "man"],
  him: ["men", "man"],
};

export function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampTag(phrase: string): string {
  return clampEtsyTag(phrase, ETSY_TAG_MAX).toLowerCase();
}

function wordsOf(phrase: string): string[] {
  return normalizePhrase(phrase).split(/\s+/).filter(Boolean);
}

/** True if `needle` appears as a contiguous word sequence inside `haystack`. */
function containsPhrase(haystack: string, needle: string): boolean {
  const h = wordsOf(haystack);
  const n = wordsOf(needle);
  if (!n.length || n.length > h.length) return false;
  for (let i = 0; i <= h.length - n.length; i++) {
    if (n.every((w, j) => h[i + j] === w)) return true;
  }
  return false;
}

function tagCorpus(tags: string[]): string {
  return tags.map((t) => normalizePhrase(t)).join(" ");
}

function tagWordSet(tags: string[]): Set<string> {
  return new Set(wordsOf(tagCorpus(tags)));
}

/** Significant title words eRank may flag if missing from tags. */
export function extractTitleKeywords(title: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of wordsOf(title)) {
    if (SKIP_WORDS.has(w)) continue;
    if (w.length < 3) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

export function wordCoveredByTags(word: string, tags: string[]): boolean {
  const w = normalizePhrase(word);
  if (!w) return true;
  const set = tagWordSet(tags);
  if (set.has(w)) return true;
  const aliases = WORD_ALIASES[w] || [];
  return aliases.some((a) => set.has(a));
}

/**
 * Pull priority key phrases from a title (comma segments + primary niche n-grams).
 * Phrases are ≤20 chars so they can become Etsy tags.
 */
export function extractTitleKeyPhrases(title: string): string[] {
  const segments = title
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    let segment = segments[i];
    if (i === 0) {
      segment = segment.replace(/^custom\s+/i, "").trim();
    }
    if (!segment) continue;

    const full = clampTag(segment);
    if (full.length >= 3) candidates.push(full);

    const words = wordsOf(segment).filter((w) => !SKIP_WORDS.has(w));
    if (i === 0 && words.length >= 2) {
      for (let len = Math.min(3, words.length); len >= 2; len--) {
        const phrase = clampTag(words.slice(0, len).join(" "));
        if (phrase.length >= 3) candidates.push(phrase);
      }
      if (words.length >= 3) {
        const mid = clampTag(words.slice(1, 3).join(" "));
        if (mid.length >= 3) candidates.push(mid);
      }
    }
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const key = normalizePhrase(raw);
    if (!key || seen.has(key)) continue;
    if (wordsOf(key).length < 2 && SKIP_WORDS.has(key)) continue;
    seen.add(key);
    out.push(clampTag(raw));
  }
  return out;
}

export function phraseCoveredByTags(phrase: string, tags: string[]): boolean {
  const needle = normalizePhrase(phrase);
  if (!needle) return true;
  if (tags.some((tag) => {
    const t = normalizePhrase(tag);
    return t === needle || containsPhrase(t, needle);
  })) {
    return true;
  }
  // Phrase covered if every significant word is present in tags.
  const words = wordsOf(needle).filter((w) => !SKIP_WORDS.has(w));
  return words.length > 0 && words.every((w) => wordCoveredByTags(w, tags));
}

export type TitleTagOverlapItem = {
  phrase: string;
  covered: boolean;
  kind: "phrase" | "word";
};

export type TitleTagOverlapAnalysis = {
  phrases: TitleTagOverlapItem[];
  coveredCount: number;
  totalCount: number;
  allCovered: boolean;
  missing: string[];
  titleLength: number;
  titleWordCount: number;
  titleTooShort: boolean;
  /** Words that appear in more than one niche tag. */
  repeatedTagWords: string[];
  /** Single-word tags (prefer 2–3 word phrases). */
  singleWordTags: string[];
  titleLooksStuffed: boolean;
  stuffedSegment: string | null;
};

/** Words reused across niche tags (evergreen core tags intentionally share words). */
export function findRepeatedTagWords(tags: string[]): string[] {
  const counts = new Map<string, number>();
  for (const tag of tags) {
    if (isEvergreenTag(tag)) continue;
    const seenInTag = new Set<string>();
    for (const w of wordsOf(tag)) {
      if (SKIP_WORDS.has(w) || w.length < 2) continue;
      if (seenInTag.has(w)) continue;
      seenInTag.add(w);
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, n]) => n > 1)
    .map(([w]) => w)
    .sort();
}

/**
 * Flag comma segments that dump too many models/traits into one unsearchable blob.
 */
export function findStuffedTitleSegment(title: string): string | null {
  const segments = title
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < segments.length; i++) {
    let segment = segments[i];
    if (i === 0) segment = segment.replace(/^custom\s+/i, "").trim();
    if (isRecipientKeywordDump(segment)) return segments[i];
    const words = wordsOf(segment).filter((w) => !SKIP_WORDS.has(w));
    if (words.length >= 5) return segments[i];
  }
  return null;
}

function prioritizePhrases(raw: string[]): string[] {
  const phrases: string[] = [];
  for (const p of raw) {
    const n = normalizePhrase(p);
    const subsumed = phrases.some(
      (kept) =>
        containsPhrase(kept, n) ||
        (wordsOf(kept).length === wordsOf(n).length &&
          normalizePhrase(kept) === n)
    );
    if (subsumed) continue;
    for (let i = phrases.length - 1; i >= 0; i--) {
      if (containsPhrase(n, phrases[i])) phrases.splice(i, 1);
    }
    phrases.push(p);
  }
  return phrases;
}

export function analyzeTitleTagOverlap(
  title: string,
  tags: string[]
): TitleTagOverlapAnalysis {
  const phraseItems: TitleTagOverlapItem[] = prioritizePhrases(
    extractTitleKeyPhrases(title)
  )
    .slice(0, 6)
    .map((phrase) => ({
      phrase,
      covered: phraseCoveredByTags(phrase, tags),
      kind: "phrase" as const,
    }));

  const wordsAlreadyListed = new Set(
    phraseItems.flatMap((p) => wordsOf(p.phrase))
  );

  const wordItems: TitleTagOverlapItem[] = extractTitleKeywords(title)
    .filter(
      (w) => !wordCoveredByTags(w, tags) && !wordsAlreadyListed.has(w)
    )
    .slice(0, 8)
    .map((word) => ({
      phrase: word,
      covered: false,
      kind: "word" as const,
    }));

  const items = [...phraseItems, ...wordItems];
  const coveredCount = items.filter((i) => i.covered).length;
  const missing = items.filter((i) => !i.covered).map((i) => i.phrase);
  const titleTrim = title.replace(/\s+/g, " ").trim();
  const titleLength = titleTrim.length;
  const titleWordCount = titleTrim
    ? titleTrim.split(/\s+/).filter(Boolean).length
    : 0;
  const stuffedSegment = findStuffedTitleSegment(title);
  const repeatedTagWords = findRepeatedTagWords(tags);
  const singleWordTags = findSingleWordTags(tags);

  return {
    phrases: items,
    coveredCount,
    totalCount: items.length,
    allCovered: items.length === 0 || missing.length === 0,
    missing,
    titleLength,
    titleWordCount,
    titleTooShort:
      titleWordCount > 0 && titleWordCount < ETSY_TITLE_SOFT_MIN_WORDS,
    repeatedTagWords,
    singleWordTags,
    titleLooksStuffed: Boolean(stuffedSegment),
    stuffedSegment,
  };
}

/** Tags with fewer than 2 words — prefer 2–3 word phrases. */
export function findSingleWordTags(tags: string[]): string[] {
  return (tags || [])
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t && wordsOf(t).length < 2);
}

/**
 * Pack tags so title phrases/words are covered: niche from title + evergreen core.
 * Second pass injects short multi-word tags for any title keywords still missing.
 */
export function ensureTitleKeywordsInTags(
  title: string,
  tags: string[],
  count = ETSY_TAG_COUNT,
  opts?: { subject?: string; niche?: string; trending?: string[] }
): string[] {
  const missingSeeds = extractTitleKeywords(title)
    .filter(
      (w) =>
        ![
          "birthday",
          "men",
          "man",
          "dad",
          "boyfriend",
          "him",
          "gift",
          "for",
          "photo",
          "shirt",
          "personalized",
          "car",
        ].includes(w)
    )
    .flatMap((w) => [`${w} gift`, `${w} shirt`]);

  let packed = buildListingTags({
    subject: opts?.subject || title,
    title,
    niche: opts?.niche,
    trending: opts?.trending,
    candidates: [...missingSeeds, ...(tags || [])],
    count,
  });

  // If anything is still uncovered, swap the last niche tag(s) for cover phrases.
  // Skip weak filler words that create incomplete/stuffed tags (birthday/men/dad…).
  const WEAK_COVER = new Set([
    "birthday",
    "men",
    "man",
    "dad",
    "boyfriend",
    "him",
    "gift",
    "for",
    "photo",
    "shirt",
    "personalized",
    "car",
  ]);

  const missing = extractTitleKeywords(title).filter(
    (w) => !wordCoveredByTags(w, packed) && !WEAK_COVER.has(w)
  );
  if (!missing.length) return packed;

  const niche: string[] = [];
  const evergreen: string[] = [];
  for (const t of packed) {
    if (isEvergreenTag(t)) evergreen.push(t);
    else niche.push(t);
  }

  for (const word of missing) {
    if (wordCoveredByTags(word, [...niche, ...evergreen])) continue;
    const next = clampTag(`${word} gift`);
    if (!next || wordsOf(next).length < 2) continue;
    if (isEvergreenTag(next)) continue;
    if (niche.length >= 3) {
      niche[niche.length - 1] = next;
    } else {
      niche.push(next);
    }
  }

  return [...niche.slice(0, 3), ...evergreen].slice(0, count);
}
