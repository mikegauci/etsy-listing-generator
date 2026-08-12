import {
  MEDIA_ALT_TEXT_MAX,
  MEDIA_ALT_TEXT_MIN,
  MEDIA_SLOTS,
} from "./product-options";
import { nicheTagCandidates, tagMatchesSubjectNiche } from "./tags";

function truncateAtWord(str: string, max: number): string {
  const cleaned = str.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return cut.replace(/[,:;.-]+$/, "").trim();
}

function hasPhrase(haystack: string, phrase: string): boolean {
  return haystack.toLowerCase().includes(phrase.toLowerCase().trim());
}

function joinOr(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items[items.length - 1]}`;
}

function normalizeKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function uniquePhrases(phrases: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of phrases) {
    const p = raw.replace(/\s+/g, " ").trim();
    if (p.length < 2) continue;
    const key = normalizeKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p.toLowerCase());
  }
  return out;
}

const SECTION_DIVIDER = "____________________";

/** Soft cap on the visual seed so SEO phrases still fit. */
const BASE_BUDGET = 140;

/** How many SEO phrases to weave into each media alt text. */
const PHRASES_PER_SLOT = 5;

type SlotVisualFn = (subject: string, product: string) => string;

/** Unique visual lead copy per media slot (not keyword dumps). */
const SLOT_VISUALS: Record<string, SlotVisualFn> = {
  "Featured Image": (s, p) =>
    `Hero mockup of a ${s} ${p} with Motor Element custom car-photo artwork front and center`,
  "Four Step Progress": (s, p) =>
    `Four-step progress graphic showing a ${s} photo transformed into custom ${p} artwork`,
  "Backgrounds Grid": (s, p) =>
    `Grid of theme background options behind a ${s} ${p} design preview`,
  "How to Order": (s, p) =>
    `How-to-order steps for personalizing a ${s} ${p} from your vehicle photo`,
  "No Background": (s, p) =>
    `Clean no-background ${s} illustration on a ${p} for a minimal custom look`,
  "Custom Background": (s, p) =>
    `Custom background scene paired with a ${s} ${p} car-photo illustration`,
  "Male Front Black Shirt": (s, p) =>
    `Male model front view in a black ${p} featuring a ${s} custom car print`,
  "Male Front White Shirt": (s, p) =>
    `Male model front view in a white ${p} featuring a ${s} custom car print`,
  "Female Front Black Shirt": (s, p) =>
    `Female model front view in a black ${p} featuring a ${s} custom car print`,
  "Female Front White Shirt": (s, p) =>
    `Female model front view in a white ${p} featuring a ${s} custom car print`,
  "Male Back Black Shirt": (s, p) =>
    `Male model back view in a black ${p} with a ${s} custom car print placement`,
  "Male Back White Shirt": (s, p) =>
    `Male model back view in a white ${p} with a ${s} custom car print placement`,
  "Female Back Black Shirt": (s, p) =>
    `Female model back view in a black ${p} with a ${s} custom car print placement`,
  "Female Back White Shirt": (s, p) =>
    `Female model back view in a white ${p} with a ${s} custom car print placement`,
  "The Perfect Gift": (s, p) =>
    `Gift-focused layout highlighting a ${s} ${p} as a personal automotive present`,
  "Material Info": (s, p) =>
    `Material and fabric details for a premium ${s} ${p} with durable custom print`,
  "T-Shirt Sizes": (s, p) =>
    `Size chart guidance for ordering the right fit on a ${s} ${p}`,
};

const WEAVE_LEADS = [
  "Great for searches like",
  "Also ranks for",
  "Helps shoppers find",
  "Useful for queries such as",
  "Supports discovery around",
  "Built to match interest in",
  "Appeals to buyers after",
  "Strong fit for",
] as const;

/** Slot-themed bonus phrases (beyond the listing's top 13 tags). */
function slotBonusPhrases(slot: string, subject: string, product: string): string[] {
  const niche = subject
    .replace(/^custom\s+/i, "")
    .replace(/\s+(t-?shirts?|tees?|hoodies?)$/i, "")
    .trim() || subject;
  const short = niche.split(/\s+/).slice(0, 2).join(" ") || niche;
  const productWord = product.replace(/-/g, " ").trim() || "shirt";

  const bySlot: Record<string, string[]> = {
    "Featured Image": [
      `${short} mockup`,
      `custom ${short}`,
      `${short} apparel`,
    ],
    "Four Step Progress": [
      `${short} process`,
      `photo to ${productWord}`,
      `custom art process`,
    ],
    "Backgrounds Grid": [
      `${short} background`,
      `car photo background`,
      `theme background shirt`,
    ],
    "How to Order": [
      `order custom ${productWord}`,
      `${short} personalization`,
      `custom order shirt`,
    ],
    "No Background": [
      `${short} no background`,
      `minimal car shirt`,
      `clean car illustration`,
    ],
    "Custom Background": [
      `custom scene shirt`,
      `${short} scene art`,
      `personalized backdrop`,
    ],
    "Male Front Black Shirt": [
      `mens ${short} shirt`,
      `black ${productWord} mockup`,
      `${short} front print`,
    ],
    "Male Front White Shirt": [
      `mens white ${productWord}`,
      `${short} tee mockup`,
      `white car shirt`,
    ],
    "Female Front Black Shirt": [
      `womens ${short} shirt`,
      `black tee for her`,
      `${short} ladies tee`,
    ],
    "Female Front White Shirt": [
      `womens white ${productWord}`,
      `${short} for her`,
      `ladies car shirt`,
    ],
    "Male Back Black Shirt": [
      `back print ${short}`,
      `mens back ${productWord}`,
      `${short} back design`,
    ],
    "Male Back White Shirt": [
      `white back print tee`,
      `${short} rear print`,
      `mens back design`,
    ],
    "Female Back Black Shirt": [
      `womens back print`,
      `${short} back tee`,
      `ladies back design`,
    ],
    "Female Back White Shirt": [
      `womens white back`,
      `${short} rear tee`,
      `ladies back print`,
    ],
    "The Perfect Gift": [
      `${short} present`,
      `car lover gift`,
      `automotive birthday gift`,
      `fathers day car gift`,
    ],
    "Material Info": [
      `soft ${productWord} print`,
      `premium ${short} tee`,
      `quality car apparel`,
    ],
    "T-Shirt Sizes": [
      `${short} size chart`,
      `${productWord} sizing guide`,
      `unisex car tee sizes`,
    ],
  };

  return (bySlot[slot] || [`${short} ${productWord}`, `${short} gift`]).filter(
    (p) => tagMatchesSubjectNiche(p, niche) || /\b(gift|mockup|print|size|background|process|order|mens|womens|ladies|premium|quality|soft|unisex|front|back|white|black|minimal|clean|theme|scene|art|apparel|tee|shirt)\b/i.test(p)
  );
}

/**
 * Expanded SEO phrase pool: listing tags + extra niche candidates + trending,
 * including phrases that did not make the top-13 tag set.
 */
export function buildAltSeoPhrasePool(opts: {
  subject: string;
  title?: string;
  tags: string[];
  trending?: string[];
  extra?: string[];
}): string[] {
  const extras = nicheTagCandidates({
    subject: opts.subject,
    title: opts.title,
    trending: opts.trending,
    extra: opts.extra,
  });

  return uniquePhrases([...(opts.tags || []), ...extras, ...(opts.trending || [])]);
}

/** Rotate through the pool so each slot gets a different phrase mix. */
function pickPhrasesForSlot(
  pool: string[],
  slotIndex: number,
  count = PHRASES_PER_SLOT
): string[] {
  if (!pool.length) return [];
  const n = Math.min(count, pool.length);
  const start = (slotIndex * Math.max(2, Math.floor(count / 2))) % pool.length;
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < pool.length && out.length < n; i++) {
    const phrase = pool[(start + i) % pool.length];
    const key = normalizeKey(phrase);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(phrase);
  }
  return out;
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  // Drop prior keyword-dump tails if regenerating from a stuffed model/mock base.
  const withoutDump = cleaned
    .replace(
      /\b(Great match for|Great for searches like|Also ranks for|Helps shoppers find|Useful for queries such as|Supports discovery around|Built to match interest in|Appeals to buyers after|Strong fit for)\b[\s\S]*$/i,
      ""
    )
    .trim();
  const match = withoutDump.match(/^(.+?[.!?])(?:\s|$)/);
  return (match?.[1] || withoutDump).trim();
}

function weavePhrases(
  visual: string,
  phrases: string[],
  slotIndex: number,
  max: number
): string {
  const lead = WEAVE_LEADS[slotIndex % WEAVE_LEADS.length];
  const usable = phrases.filter((p) => !hasPhrase(visual, p));
  if (!usable.length) return visual;

  let packed = `${visual}${/[.!?…]$/.test(visual) ? "" : "."} ${lead} `;
  let added = 0;
  for (const phrase of usable) {
    const next = added === 0 ? `${packed}${phrase}` : `${packed}, ${phrase}`;
    if (next.length > max) break;
    packed = next;
    added += 1;
  }
  return added > 0 ? packed : visual;
}

/**
 * Build unique, slot-aware SEO alt text.
 * Each slot gets its own visual description and a rotated mix of listing tags
 * plus extra SEO phrases that may sit outside the top-13 tag set.
 */
export function buildSeoAltText(opts: {
  subject: string;
  product?: string;
  slot?: string;
  slotIndex?: number;
  tags: string[];
  /** Extra SEO phrases (trending, unused niche candidates, etc.). */
  seoPhrases?: string[];
  title?: string;
  trending?: string[];
  /** Optional model- or mock-generated seed; visual uniqueness still enforced. */
  base?: string;
}): string {
  const subject = opts.subject.trim() || "custom car";
  const product = (opts.product || "t-shirt").trim();
  const slot = opts.slot?.trim();
  const slotIndex =
    opts.slotIndex ??
    (slot ? Math.max(0, MEDIA_SLOTS.indexOf(slot as (typeof MEDIA_SLOTS)[number])) : 0);

  const visualFn = slot ? SLOT_VISUALS[slot] : undefined;
  const slotVisual = visualFn
    ? visualFn(subject, product)
    : `${subject} ${product}, Motor Element custom car-photo apparel`;

  // Prefer slot-specific visual; if a model base exists, keep only its first sentence
  // as optional flavor when it still mentions the slot/subject uniquely.
  let visual = slotVisual;
  if (opts.base?.trim()) {
    const seeded = firstSentence(opts.base);
    if (
      seeded &&
      seeded.length >= 40 &&
      (!slot || seeded.toLowerCase().includes(slot.toLowerCase().split(" ")[0]))
    ) {
      visual = seeded;
    }
  }
  if (visual.length > BASE_BUDGET) {
    visual = truncateAtWord(visual, BASE_BUDGET);
  }

  const pool = uniquePhrases([
    ...(opts.seoPhrases || []),
    ...(opts.tags || []),
    ...buildAltSeoPhrasePool({
      subject,
      title: opts.title,
      tags: opts.tags,
      trending: opts.trending,
    }),
    ...(slot ? slotBonusPhrases(slot, subject, product) : []),
  ]);

  const phrases = pickPhrasesForSlot(
    pool,
    Math.max(0, slotIndex),
    slot ? PHRASES_PER_SLOT : 6
  );

  let text = weavePhrases(visual, phrases, Math.max(0, slotIndex), MEDIA_ALT_TEXT_MAX);

  if (text.length < MEDIA_ALT_TEXT_MIN) {
    for (const phrase of pool) {
      if (hasPhrase(text, phrase)) continue;
      const next = `${text}, ${phrase}`;
      if (next.length > MEDIA_ALT_TEXT_MAX) break;
      text = next;
      if (text.length >= MEDIA_ALT_TEXT_MIN) break;
    }
  }

  return truncateAtWord(text, MEDIA_ALT_TEXT_MAX);
}

/**
 * Ensure recommended listing tags appear as exact phrases in the description.
 * Inserts a short natural SEO paragraph after the opening (before the first
 * section divider) for any tags the body is still missing. Avoids a bare
 * comma-only keyword dump at the bottom.
 */
export function enrichDescriptionWithSeoTags(
  description: string,
  tags: string[]
): string {
  const body = (description || "").replace(/—/g, "-").trim();
  const cleanedTags = (tags || [])
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 2);

  const missing = cleanedTags.filter((t) => !hasPhrase(body, t));
  if (!missing.length) return body;

  const niche = missing.slice(0, 3);
  const rest = missing.slice(3);

  const sentences: string[] = [];
  if (niche.length) {
    sentences.push(`Looking for a ${joinOr(niche)}?`);
  }
  if (rest.length) {
    const giftish = rest.filter((t) => /\bgift\b/i.test(t));
    const other = rest.filter((t) => !/\bgift\b/i.test(t));
    if (other.length) {
      sentences.push(
        `This custom car-photo piece also fits shoppers after a ${joinOr(other)}.`
      );
    }
    if (giftish.length) {
      sentences.push(
        `It makes a thoughtful ${joinOr(giftish)} for car fans and buyers who want something personal.`
      );
    }
  }

  const seoParagraph = sentences.join(" ");
  const dividerIdx = body.indexOf(SECTION_DIVIDER);

  if (dividerIdx > 0) {
    const opening = body.slice(0, dividerIdx).trimEnd();
    const restBody = body.slice(dividerIdx);
    return `${opening}\n\n${seoParagraph}\n\n${restBody}`;
  }

  return `${body}\n\n${seoParagraph}`;
}
