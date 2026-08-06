import { containsGarmentColor, isColorOnlyPhrase, isRecipientKeywordDump } from "./listing-title";

/** Etsy tag hard limits. Never cut mid-word when clamping. */
export const TAG_MAX_CHARS = 20;
export const TAG_COUNT = 13;
export const ETSY_TAG_MAX_CHARS = TAG_MAX_CHARS;
export const ETSY_TAG_COUNT = TAG_COUNT;

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

export const EVERGREEN_CORE_TAGS = EVERGREEN_TAGS;

/** Niche-specific tags to reserve (evergreen fills the rest → usually 3). */
export const NICHE_TAG_TARGET_MIN = 3;
export const NICHE_TAG_TARGET_MAX = 4;

const EVERGREEN_SET = new Set(EVERGREEN_TAGS.map((t) => t.toLowerCase()));

/**
 * Fit a phrase into Etsy's tag length by dropping whole words from the end.
 * Avoids mid-word truncation and dangling stop words like "birthday gift for".
 */
export function clampEtsyTag(phrase: string, max = TAG_MAX_CHARS): string {
  let t = phrase.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) {
    return stripDanglingTagWords(t);
  }

  const words = t.split(" ").filter(Boolean);
  while (words.length > 1) {
    words.pop();
    const next = stripDanglingTagWords(words.join(" "));
    if (next && next.length <= max && next.split(/\s+/).length >= 2) {
      return next;
    }
  }

  return "";
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

export function normalizeTag(phrase: string): string {
  return clampEtsyTag(phrase, TAG_MAX_CHARS);
}

function normalizeTagKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isMultiWord(tag: string): boolean {
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

  let n = 1;
  while (out.length < count) {
    push(`car gift idea ${n}`);
    n += 1;
    if (n > 20) break;
  }

  return out.slice(0, count);
}

/** One-line comma-separated tags for display and Etsy paste. */
export function formatTagsLine(tags: string[] | null | undefined): string {
  return (tags || [])
    .flatMap((tag) => tag.split(/[\n\r]+/))
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseTagsLine(line: string): string[] {
  return line
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
