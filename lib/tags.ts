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

function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !NICHE_GENERIC_WORDS.has(w));
}

/** True when the tag shares a real niche token with the subject (not just "shirt"/"gift"). */
export function tagMatchesSubjectNiche(
  tag: string,
  subjectNiche: string
): boolean {
  const subjectTokens = new Set(contentTokens(subjectNiche));
  if (subjectTokens.size === 0) return true;
  return contentTokens(tag).some((t) => subjectTokens.has(t));
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
 * Prefers 2–3 word phrases ≤20 chars. Title segments come first so
 * important title keywords land in the niche slots.
 */
export function nicheTagCandidates(opts: {
  subject: string;
  title?: string;
  niche?: string;
  trending?: string[];
  extra?: string[];
}): string[] {
  const niche =
    (opts.niche || "").trim() ||
    opts.subject
      .replace(/^custom\s+/i, "")
      .replace(/\s+(t-?shirts?|tees?|hoodies?)$/i, "")
      .trim() ||
    opts.subject.trim();

  const nicheWords = niche.split(/\s+/).filter(Boolean);
  const short = nicheWords.slice(0, 2).join(" ") || niche;
  const first = nicheWords[0] || "car";

  const fromTitle = (opts.title || "")
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((seg, i) =>
      i === 0 ? seg.replace(/^custom\s+/i, "").trim() : seg
    )
    // Only keep clean title segments — skip gift/recipient keyword dumps.
    .filter((seg) => seg && !isRecipientKeywordDump(seg));

  // Prefer the lead niche/product segment; skip generic photo/gift trails as niche tags
  // (those are already covered by evergreen tags).
  const leadTitle = fromTitle[0] ? [fromTitle[0]] : [];

  const seeds = [
    ...leadTitle,
    ...(opts.trending || []),
    ...(opts.extra || []),
    `${short} shirt`,
    `${short} gift`,
    `${first} car gift`,
    `${short} tee`,
  ];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of seeds) {
    const tag = clampEtsyTag(raw).toLowerCase();
    if (!tag || !isMultiWord(tag)) continue;
    if (isEvergreenTag(tag)) continue;
    if (isRecipientKeywordDump(tag)) continue;
    // Drop off-niche junk / typos (e.g. "personalized cat" when subject is car/Hellcat).
    if (!tagMatchesSubjectNiche(tag, niche)) continue;
    {
      const words = tag.split(/\s+/);
      const colorFocused =
        isColorOnlyPhrase(tag) ||
        (words.some((w) => containsGarmentColor(w)) &&
          words.every(
            (w) =>
              containsGarmentColor(w) ||
              ["tee", "shirt", "tshirt", "t-shirt", "or", "and"].includes(w)
          ));
      if (colorFocused) continue;
    }
    const key = normalizeTagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
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

  const nichePool = nicheTagCandidates({
    subject: opts.subject,
    title: opts.title,
    niche: opts.niche,
    trending: opts.trending,
    extra: opts.candidates,
  });

  const out: string[] = [];
  const outSeen = new Set<string>();

  const push = (raw: string) => {
    if (out.length >= count) return false;
    const tag = clampEtsyTag(raw).toLowerCase();
    if (!tag || tag.length < 2) return false;
    const key = normalizeTagKey(tag);
    if (outSeen.has(key)) return false;
    outSeen.add(key);
    out.push(tag);
    return true;
  };

  // 1) Niche first (3) so all 10 evergreen still fit
  for (const t of nichePool.slice(0, NICHE_TAG_TARGET_MIN)) push(t);

  // 2) Evergreen core
  for (const t of EVERGREEN_TAGS) push(t);

  // 3) Extra niche only if a slot remains
  for (const t of nichePool.slice(NICHE_TAG_TARGET_MIN)) {
    if (out.length >= count) break;
    push(t);
  }

  // If still short (very unusual), repeat truncated subject fragments — never junk.
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
