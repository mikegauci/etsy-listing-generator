import { containsGarmentColor, isColorOnlyPhrase, isRecipientKeywordDump } from "./listing-title";

/** Etsy tag hard limits. Never cut mid-word when clamping multi-word phrases. */
export const TAG_MAX_CHARS = 20;
export const TAG_COUNT = 13;

/**
 * Always-on Motor Element tags (custom car photo apparel + gift intent).
 * Intentionally share words (custom/car/gift/shirt) — that is OK.
 */
export const EVERGREEN_TAGS = [
  "custom car shirt",
  "custom car tshirt",
  "graphic tshirt",
  "personalized tshirt",
  "personalized gift",
  "gift for him",
  "gift for dad",
  "gift for boyfriend",
  "custom photo shirt",
  "custom car photo",
] as const;

/** Niche-specific tags to reserve (evergreen fills the rest → usually 3). */
export const NICHE_TAG_TARGET_MIN = 3;

const EVERGREEN_SET = new Set(EVERGREEN_TAGS.map((t) => t.toLowerCase()));

/**
 * Generic apparel/gift words that do not prove a niche tag belongs to the subject.
 * A niche tag must share at least one non-generic token with the subject/title niche
 * (stops model typos like "personalized cat" for a car listing).
 */
const NICHE_GENERIC_WORDS = new Set([
  "custom",
  "personalized",
  "personalised",
  "graphic",
  "gift",
  "gifts",
  "shirt",
  "shirts",
  "tee",
  "tees",
  "tshirt",
  "tshirts",
  "t-shirt",
  "t-shirts",
  "hoodie",
  "hoodies",
  "sweatshirt",
  "sweatshirts",
  "photo",
  "photos",
  "print",
  "prints",
  "apparel",
  "for",
  "him",
  "her",
  "dad",
  "boyfriend",
  "men",
  "women",
  "guy",
  "guys",
]);

function contentTokens(
  text: string,
  genericWords: ReadonlySet<string> = NICHE_GENERIC_WORDS
): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !genericWords.has(w));
}

export function tagMatchesSubjectNiche(
  tag: string,
  subjectNiche: string,
  nicheGenericWords?: ReadonlySet<string>
): boolean {
  const subjectTokens = new Set(
    contentTokens(subjectNiche, nicheGenericWords ?? NICHE_GENERIC_WORDS)
  );
  if (subjectTokens.size === 0) return true;
  return contentTokens(tag, nicheGenericWords ?? NICHE_GENERIC_WORDS).some((t) =>
    subjectTokens.has(t)
  );
}

export function tagMatchesDistinctiveNiche(
  tag: string,
  subjectNiche: string,
  nicheGenericWords?: ReadonlySet<string>,
  distinctiveStopWords?: ReadonlySet<string>
): boolean {
  const distinctive = distinctiveNicheTokens(
    subjectNiche,
    nicheGenericWords,
    distinctiveStopWords
  );
  if (distinctive.length === 0) {
    return tagMatchesSubjectNiche(tag, subjectNiche, nicheGenericWords);
  }
  const tagTokens = new Set(
    contentTokens(tag, nicheGenericWords ?? NICHE_GENERIC_WORDS)
  );
  return distinctive.some((t) => tagTokens.has(t));
}

function distinctiveNicheTokens(
  subjectNiche: string,
  nicheGenericWords?: ReadonlySet<string>,
  distinctiveStopWords: ReadonlySet<string> = MOTOR_ELEMENT_TAG_NICHE.distinctiveStopWords
): string[] {
  return contentTokens(
    subjectNiche,
    nicheGenericWords ?? NICHE_GENERIC_WORDS
  ).filter((t) => !distinctiveStopWords.has(t));
}

/**
 * Fit a phrase into Etsy's tag length by dropping whole words from the end.
 * For a single overlong word, truncate at max (better than discarding the niche).
 * Avoids dangling stop words like "birthday gift for".
 */
export function clampEtsyTag(phrase: string, max = TAG_MAX_CHARS): string {
  const cleaned = phrase.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) {
    return stripDanglingTagWords(cleaned);
  }

  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, max);
  }

  while (words.length > 1) {
    words.pop();
    const next = stripDanglingTagWords(words.join(" "));
    if (next && next.length <= max && next.split(/\s+/).length >= 2) {
      return next;
    }
  }

  // Last remaining word may still be over max.
  const last = words[0] || "";
  return last.length <= max ? last : last.slice(0, max);
}

const TAG_TRAILING_STOP = new Set([
  "for",
  "and",
  "or",
  "the",
  "a",
  "an",
  "of",
  "to",
  "with",
  "in",
  "on",
  "from",
  "your",
  "my",
  "our",
  "by",
  "as",
  "into",
]);

/** Drop trailing prepositions/articles so tags stay complete phrases. */
export function stripDanglingTagWords(tag: string): string {
  const words = tag.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  while (
    words.length > 0 &&
    TAG_TRAILING_STOP.has(words[words.length - 1].toLowerCase())
  ) {
    words.pop();
  }
  return words.join(" ");
}

/**
 * True when a tag is a complete short phrase that fits Etsy without truncation junk.
 * Rejects long-tails like "car shirt from your photo" that clamp to "car shirt from your".
 */
export function isCompleteEtsyTag(tag: string, max = TAG_MAX_CHARS): boolean {
  const t = stripDanglingTagWords(tag.replace(/\s+/g, " ").trim());
  if (!t || t.length > max) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  if (TAG_TRAILING_STOP.has(words[words.length - 1].toLowerCase())) return false;
  // Long-tail photo/customize trails are evergreen territory, not niche tags.
  const lower = t.toLowerCase();
  if (/\bfrom your\b/.test(lower)) return false;
  if (/\byour (car |photo|picture)\b/.test(lower)) return false;
  return true;
}

/**
 * Prefer short 2–3 word seeds that already fit ≤20 chars.
 * For longer title segments, keep only compact prefixes that remain complete tags.
 */
function shortTagSeeds(phrase: string, max = TAG_MAX_CHARS): string[] {
  const cleaned = stripDanglingTagWords(phrase.replace(/\s+/g, " ").trim());
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const tag = stripDanglingTagWords(raw);
    if (!isCompleteEtsyTag(tag, max)) return;
    const key = normalizeTagKey(tag);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(tag);
  };

  // Whole phrase only when it already fits — never clamp mid long-tail into niche tags.
  if (cleaned.length <= max) push(cleaned);

  // Compact 2–3 word windows from the start (and 2-word pairs).
  for (let n = Math.min(3, words.length); n >= 2; n--) {
    push(words.slice(0, n).join(" "));
  }
  for (let i = 0; i + 1 < words.length && i < 3; i++) {
    push(words.slice(i, i + 2).join(" "));
  }

  return out;
}

const TAG_PRODUCT_OR_GIFT = new Set([
  "shirt",
  "shirts",
  "tee",
  "tees",
  "tshirt",
  "tshirts",
  "t-shirt",
  "t-shirts",
  "hoodie",
  "hoodies",
  "sweatshirt",
  "gift",
  "gifts",
]);

/**
 * Per-shop vocabulary for niche tag building. Without this the shirt/tee wording
 * below leaks into other shops, both in their tags and in the SEO paragraph the
 * description enrichment weaves from those tags.
 */
export type TagNicheProfile = {
  productWords: ReadonlySet<string>;
  buildSeeds: (first: string, shortBase: string) => string[];
  subjectPrefix: RegExp;
  /** Trailing product words dropped when deriving the niche from the subject. */
  productSuffix: RegExp;
  /** Trailing product and gift words dropped when deriving the short tag base. */
  baseSuffix: RegExp;
  /** Product words that, alongside a color word, make a tag purely color-focused. */
  colorPairWords: ReadonlySet<string>;
  distinctiveStopWords: ReadonlySet<string>;
};

export const MOTOR_ELEMENT_TAG_NICHE: TagNicheProfile = {
  productWords: TAG_PRODUCT_OR_GIFT,
  buildSeeds: (first, shortBase) => [
    `${shortBase} shirt`,
    `${shortBase} gift`,
    `${first} car gift`,
    `${first} shirt`,
    `${shortBase} tee`,
  ],
  subjectPrefix: /^custom\s+/i,
  productSuffix: /\s+(t-?shirts?|tees?|hoodies?)$/i,
  baseSuffix: /\s+(t-?shirts?|tees?|shirts?|hoodies?|gifts?)$/i,
  colorPairWords: new Set(["tee", "shirt", "tshirt", "t-shirt"]),
  distinctiveStopWords: new Set(["car", "cars"]),
};

function hasProductOrGiftWord(
  tag: string,
  productWords: ReadonlySet<string>
): boolean {
  return tag
    .toLowerCase()
    .split(/\s+/)
    .some((w) => productWords.has(w));
}

function normalizeTagKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function isMultiWord(tag: string): boolean {
  return tag.trim().split(/\s+/).filter(Boolean).length >= 2;
}

export function isEvergreenTag(tag: string): boolean {
  return EVERGREEN_SET.has(normalizeTagKey(tag));
}

/**
 * Build niche-specific tag candidates from subject / title / trends.
 * Prefers complete 2–3 word phrases ≤20 chars. Never invents truncated long-tails.
 */
export function nicheTagCandidates(opts: {
  subject: string;
  title?: string;
  niche?: string;
  trending?: string[];
  extra?: string[];
  nicheGenericWords?: ReadonlySet<string>;
  tagNiche?: TagNicheProfile;
}): string[] {
  const profile = opts.tagNiche ?? MOTOR_ELEMENT_TAG_NICHE;
  const niche =
    (opts.niche || "").trim() ||
    opts.subject
      .replace(profile.subjectPrefix, "")
      .replace(profile.productSuffix, "")
      .trim() ||
    opts.subject.trim();

  const nicheWords = niche.split(/\s+/).filter(Boolean);
  const first = nicheWords[0] || "car";
  const short = nicheWords.slice(0, 2).join(" ") || niche;
  const shortBase = short.replace(profile.baseSuffix, "").trim() || first;

  const fromTitle = (opts.title || "")
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((seg, i) =>
      i === 0 ? seg.replace(profile.subjectPrefix, "").trim() : seg
    )
    // Only keep clean title segments — skip gift/recipient keyword dumps.
    .filter((seg) => seg && !isRecipientKeywordDump(seg));

  // Expand title segments into short complete seeds (skip long-tail photo trails).
  const fromTitleShort = fromTitle.flatMap((seg) => shortTagSeeds(seg));

  const seeds = [
    ...fromTitleShort,
    ...(opts.trending || []),
    ...(opts.extra || []),
    ...profile.buildSeeds(first, shortBase),
  ];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of seeds) {
    // Only accept phrases that already fit as complete tags — no word-drop clamp for niche.
    for (const candidate of shortTagSeeds(raw)) {
      const tag = candidate.toLowerCase();
      if (!tag || !isMultiWord(tag)) continue;
      if (!isCompleteEtsyTag(tag)) continue;
      if (isEvergreenTag(tag)) continue;
      if (isRecipientKeywordDump(tag)) continue;
      // Drop off-niche junk / typos (e.g. "personalized cat" when subject is car/Hellcat).
      if (!tagMatchesSubjectNiche(tag, niche, opts.nicheGenericWords)) continue;
      // Prefer real niche (jdm/racing/…) over generic "car shirt" when subject has one.
      if (
        !tagMatchesDistinctiveNiche(
          tag,
          niche,
          opts.nicheGenericWords,
          profile.distinctiveStopWords
        )
      )
        continue;
      if (!hasProductOrGiftWord(tag, profile.productWords)) continue;
      {
        const words = tag.split(/\s+/);
        const colorFocused =
          isColorOnlyPhrase(tag) ||
          (words.some((w) => containsGarmentColor(w)) &&
            words.every(
              (w) =>
                containsGarmentColor(w) ||
                profile.colorPairWords.has(w) ||
                w === "or" ||
                w === "and"
            ));
        if (colorFocused) continue;
      }
      const key = normalizeTagKey(tag);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

/**
 * Pack listing tags: 3 niche tags (from title/subject) + evergreen core → 13.
 * Pass `title` so title keywords are mirrored into the niche slots.
 * Never invents junk filler like "car gift idea N".
 */
export function buildListingTags(
  nicheTagsOrOpts:
    | string[]
    | {
        subject: string;
        title?: string;
        niche?: string;
        trending?: string[];
        candidates?: string[];
        count?: number;
        evergreenTags?: readonly string[];
        nicheGenericWords?: ReadonlySet<string>;
        tagNiche?: TagNicheProfile;
      }
): string[] {
  // Back-compat: buildListingTags(["ford shirt", ...])
  if (Array.isArray(nicheTagsOrOpts)) {
    return buildListingTags({
      subject: nicheTagsOrOpts[0] || "car",
      candidates: nicheTagsOrOpts,
    });
  }

  const opts = nicheTagsOrOpts;
  const count = opts.count ?? TAG_COUNT;
  const evergreen = opts.evergreenTags ?? EVERGREEN_TAGS;
  const evergreenSet = new Set(evergreen.map((t) => t.toLowerCase()));
  const isShopEvergreen = (tag: string) =>
    evergreenSet.has(normalizeTagKey(tag));

  const nichePool = nicheTagCandidates({
    subject: opts.subject,
    title: opts.title,
    niche: opts.niche,
    trending: opts.trending,
    extra: opts.candidates,
    nicheGenericWords: opts.nicheGenericWords,
    tagNiche: opts.tagNiche,
  });

  const out: string[] = [];
  const outSeen = new Set<string>();

  const push = (raw: string) => {
    if (out.length >= count) return false;
    const candidates = isShopEvergreen(raw) || isEvergreenTag(raw)
      ? [clampEtsyTag(raw).toLowerCase()].filter(Boolean)
      : shortTagSeeds(raw).map((t) => t.toLowerCase());
    for (const tag of candidates) {
      if (!tag || tag.length < 2) continue;
      if (
        !isShopEvergreen(tag) &&
        !isEvergreenTag(tag) &&
        !isCompleteEtsyTag(tag)
      )
        continue;
      const key = normalizeTagKey(tag);
      if (outSeen.has(key)) continue;
      outSeen.add(key);
      out.push(tag);
      return true;
    }
    return false;
  };

  for (const t of nichePool.slice(0, NICHE_TAG_TARGET_MIN)) push(t);

  for (const t of evergreen) push(t);

  for (const t of nichePool.slice(NICHE_TAG_TARGET_MIN)) {
    if (out.length >= count) break;
    push(t);
  }

  if (out.length < count) {
    const fallback = clampEtsyTag(`${opts.subject} gift`).toLowerCase();
    if (fallback) push(fallback);
  }

  return out.slice(0, count);
}

/** One-line comma-separated tags for display and Etsy paste. */
export function formatTagsLine(tags: string[] | null | undefined): string {
  return (tags || [])
    .flatMap((tag) => tag.split(/[\n\r]+/))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Parse a comma-separated tags line into individual tags.
 * Does not split on commas inside already-normalized tags from formatTagsLine
 * (those never contain commas after clamp).
 */
export function parseTagsLine(line: string): string[] {
  return line
    .split(",")
    .map((tag) => clampEtsyTag(tag.trim()).toLowerCase())
    .filter((tag) => tag.length >= 2)
    .slice(0, TAG_COUNT);
}
