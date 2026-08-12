import {
  containsGarmentColor,
  ensureCustomTitlePrefix,
  isColorOnlyPhrase,
  isRecipientKeywordDump,
  stripTitleFiller,
} from "./listing-title";
import { computeKeywordStats } from "./keywords";
import { getDefaultBasePriceUsd } from "./product-options";
import {
  EVERGREEN_TAGS,
  TAG_COUNT,
  TAG_MAX_CHARS,
  isMultiWord,
} from "./tags";
import type { ShopListing } from "./types";

export type FindingSeverity = "high" | "medium" | "low";

export type Finding = {
  id: string;
  severity: FindingSeverity;
  message: string;
  suggestion?: string;
};

export type ListingAuditResult = {
  listing: ShopListing;
  score: number;
  findings: Finding[];
  suggestedTitle: string | null;
  differentiationCount: number;
};

export type TagCoverage = {
  tag: string;
  listingCount: number;
  isEvergreen: boolean;
};

export type PairOverlap = {
  aId: number;
  bId: number;
  aTitle: string;
  bTitle: string;
  sharedTags: string[];
  jaccard: number;
};

export type TitlePhraseOverlap = {
  term: string;
  count: number;
  share: number;
};

export type CannibalizationReport = {
  /** How many of each listing's tags appear on no other listing. */
  differentiation: {
    etsy_listing_id: number;
    title: string;
    uniqueTagCount: number;
    uniqueTags: string[];
  }[];
  /** Distinct tags ranked by how many listings carry them. */
  tagCoverage: TagCoverage[];
  /** Worst pairwise Jaccard overlaps first. */
  pairwise: PairOverlap[];
  /** Title phrases appearing on more than half the catalog. */
  titlePhraseOverlap: TitlePhraseOverlap[];
};

export type ShopAuditResult = {
  perListing: ListingAuditResult[];
  cannibalization: CannibalizationReport;
  summary: {
    listingCount: number;
    averageScore: number;
    highFindingCount: number;
  };
};

/** Auditable fields shared by shop rows and competitor marketplace listings. */
export type AuditableFields = {
  title: string;
  tags: string[];
  description?: string | null;
  price_amount?: number | null;
  productType?: string;
};

const SEVERITY_DEDUCTION: Record<FindingSeverity, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

const EXPECTED_SECTION_MARKERS = [
  "Mockup preview",
  "Front or back artwork",
  "Details",
  "Backgrounds",
  "Personalization",
  "Materials & care",
  "Questions",
  "Explore the shop",
  "Why choose us",
  "Terms & conditions",
  "Follow us",
] as const;

const TITLE_STOP = new Set([
  "custom",
  "the",
  "and",
  "for",
  "with",
  "from",
  "a",
  "an",
  "of",
  "to",
  "gift",
  "him",
  "her",
]);

function normalizeTagKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function titleWordCount(title: string): number {
  return title.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

function primaryTitleKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !TITLE_STOP.has(w))
    .slice(0, 4);
}

function inferProductType(listing: {
  category?: string | null;
  taxonomy_path?: string | null;
  title?: string;
}): string {
  const hay = `${listing.category || ""} ${listing.taxonomy_path || ""} ${listing.title || ""}`.toLowerCase();
  if (/\bhoodie\b/.test(hay)) return "hoodie";
  if (/\bsweatshirt\b/.test(hay)) return "sweatshirt";
  if (/\btank\b/.test(hay)) return "tank top";
  if (/\bmug\b/.test(hay)) return "mug";
  if (/\bposter\b/.test(hay)) return "poster";
  if (/\bcanvas\b/.test(hay)) return "canvas print";
  if (/\bsticker\b/.test(hay)) return "sticker";
  if (/\btote\b/.test(hay)) return "tote bag";
  if (/\bphone\b/.test(hay)) return "phone case";
  return "t-shirt";
}

function pushFinding(findings: Finding[], finding: Finding) {
  findings.push(finding);
}

/**
 * Rule checks against title/tags/description/price.
 * Pure — no network. Used by shop audit and competitor compare.
 */
export function collectFindings(fields: AuditableFields): {
  findings: Finding[];
  suggestedTitle: string | null;
  score: number;
} {
  const findings: Finding[] = [];
  const title = (fields.title || "").trim();
  const tags = (fields.tags || []).map((t) => t.trim()).filter(Boolean);
  const description = fields.description || "";
  const productType = fields.productType || "t-shirt";

  if (!/^custom\b/i.test(title) && !/^car\s+guy\s+gift\b/i.test(title)) {
    pushFinding(findings, {
      id: "title-custom-prefix",
      severity: "high",
      message: 'Title does not start with "Custom" (or "Car Guy Gift" for gift-primary).',
      suggestion: 'Prefix the title with "Custom", or lead with "Car Guy Gift" when gift intent is primary.',
    });
  }

  const words = titleWordCount(title);
  if (words < 13 || words > 16) {
    pushFinding(findings, {
      id: "title-word-count",
      severity: words < 10 || words > 18 ? "high" : "medium",
      message: `Title has ${words} words (target 13–16).`,
      suggestion:
        words < 13
          ? "Pad with natural trait phrases (e.g. Custom Photo Shirt, Car Guy Gift)."
          : "Trim trailing filler segments.",
    });
  }

  if (title.length > 140) {
    pushFinding(findings, {
      id: "title-too-long",
      severity: "high",
      message: `Title is ${title.length} characters (Etsy max useful length ~140).`,
    });
  } else if (title.length > 0 && title.length < 60) {
    pushFinding(findings, {
      id: "title-short",
      severity: "low",
      message: `Title is only ${title.length} characters — unused keyword room.`,
    });
  }

  const colorParts = title
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((part) => isColorOnlyPhrase(part));
  if (colorParts.length) {
    pushFinding(findings, {
      id: "title-garment-colors",
      severity: "medium",
      message: `Title contains garment-color-only segments: ${colorParts.join("; ")}.`,
      suggestion: "Move garment colors into the description / options, not the title.",
    });
  } else if (containsGarmentColor(title)) {
    // Soft signal — colors next to niche words (e.g. Black Camaro) can be fine.
    const wordsInTitle = title.toLowerCase().split(/\s+/);
    const colorOnlyFocus =
      wordsInTitle.filter((w) => containsGarmentColor(w)).length >= 2 &&
      wordsInTitle.every(
        (w) =>
          containsGarmentColor(w) ||
          ["tee", "shirt", "tshirt", "t-shirt", "or", "and", "custom", ","].includes(
            w.replace(/,/g, "")
          )
      );
    if (colorOnlyFocus) {
      pushFinding(findings, {
        id: "title-color-focused",
        severity: "medium",
        message: "Title is overly focused on garment colors.",
      });
    }
  }

  if (title && stripTitleFiller(title) !== title.replace(/\s+/g, " ").trim()) {
    pushFinding(findings, {
      id: "title-filler",
      severity: "medium",
      message:
        "Title contains description-only filler (front/back, apparel, illustration, vehicle, owners, guy).",
      suggestion: "Keep print location and fluff in the description.",
    });
  }

  const stuffed = title
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((seg) => isRecipientKeywordDump(seg));
  if (stuffed.length) {
    pushFinding(findings, {
      id: "title-recipient-dump",
      severity: "high",
      message: `Recipient keyword stuffing in title: ${stuffed.join("; ")}.`,
      suggestion: 'Use one clean phrase like "Gift for Him".',
    });
  }

  const normalized = ensureCustomTitlePrefix(title || "Custom", 140, productType);
  const suggestedTitle =
    normalized &&
    normalized.replace(/\s+/g, " ").trim().toLowerCase() !==
      title.replace(/\s+/g, " ").trim().toLowerCase()
      ? normalized
      : null;

  if (suggestedTitle) {
    pushFinding(findings, {
      id: "title-rules-drift",
      severity: "high",
      message: "Title does not match current SEO title rules.",
      suggestion: suggestedTitle,
    });
  }

  if (tags.length < TAG_COUNT) {
    pushFinding(findings, {
      id: "tags-count",
      severity: "high",
      message: `Only ${tags.length}/${TAG_COUNT} tags used.`,
      suggestion: `Fill all ${TAG_COUNT} tag slots.`,
    });
  }

  const wasteChars = tags.reduce(
    (sum, t) => sum + Math.max(0, TAG_MAX_CHARS - t.length),
    0
  );
  if (wasteChars >= 40) {
    pushFinding(findings, {
      id: "tags-waste",
      severity: wasteChars >= 60 ? "medium" : "low",
      message: `${wasteChars} unused tag characters across the set (each tag allows ${TAG_MAX_CHARS}).`,
      suggestion: "Prefer 2–3 word phrases that fill more of the 20-char budget.",
    });
  }

  const singleWord = tags.filter((t) => !isMultiWord(t));
  if (singleWord.length) {
    pushFinding(findings, {
      id: "tags-single-word",
      severity: "medium",
      message: `${singleWord.length} single-word tag(s): ${singleWord.join(", ")}.`,
      suggestion: "Long-tail multi-word tags usually outperform single words.",
    });
  }

  const tagSet = new Set(tags.map(normalizeTagKey));
  const evergreenSet = new Set(EVERGREEN_TAGS.map((t) => t.toLowerCase()));
  const missingEvergreen = EVERGREEN_TAGS.filter(
    (t) => !tagSet.has(t.toLowerCase())
  );
  if (missingEvergreen.length) {
    pushFinding(findings, {
      id: "tags-missing-evergreen",
      severity: "medium",
      message: `Missing ${missingEvergreen.length} evergreen tag(s): ${missingEvergreen.join(", ")}.`,
      suggestion: "Evergreen tags are the shop-wide core for Motor Element.",
    });
  }

  // How many niche (non-evergreen) tags does this listing have?
  const nicheTags = tags.filter((t) => !evergreenSet.has(normalizeTagKey(t)));
  if (tags.length >= TAG_COUNT && nicheTags.length < 3) {
    pushFinding(findings, {
      id: "tags-few-niche",
      severity: "low",
      message: `Only ${nicheTags.length} niche-specific tag(s) — most slots are shared evergreen.`,
    });
  }

  if (description) {
    const opening = description.slice(0, 160).toLowerCase();
    const keywords = primaryTitleKeywords(title);
    const openingHit = keywords.some((k) => opening.includes(k));
    if (keywords.length && !openingHit) {
      pushFinding(findings, {
        id: "desc-opening-seo",
        severity: "high",
        message:
          "First ~160 characters of the description do not include primary title keywords.",
        suggestion: `Lead with niche + product (e.g. keywords: ${keywords.slice(0, 3).join(", ")}).`,
      });
    }

    if (/[—–]/.test(description) || description.includes(" - ")) {
      // Em/en dash is the real rule; soft-check only for em/en.
      if (/[—–]/.test(description)) {
        pushFinding(findings, {
          id: "desc-emdash",
          severity: "low",
          message: "Description contains em/en dashes (brand rule: avoid them).",
        });
      }
    }

    if (/\$\s?\d/.test(description) || /\b\d+\s*(usd|dollars?)\b/i.test(description)) {
      pushFinding(findings, {
        id: "desc-prices",
        severity: "high",
        message: "Description appears to include prices (forbidden in customer-facing copy).",
        suggestion: "Keep dollar amounts in options notes / seller notes only.",
      });
    }

    const missingSections = EXPECTED_SECTION_MARKERS.filter(
      (marker) => !description.toLowerCase().includes(marker.toLowerCase())
    );
    if (missingSections.length >= 4) {
      pushFinding(findings, {
        id: "desc-structure",
        severity: "medium",
        message: `Description is missing ${missingSections.length} expected section headers (e.g. ${missingSections.slice(0, 3).join(", ")}).`,
        suggestion:
          "Use the emoji-section structure: Mockup preview, Front or back artwork, Details, Backgrounds, Personalization, Materials & care, Questions, Explore the shop, Why choose us, Terms & conditions, Follow us.",
      });
    } else if (missingSections.length > 0) {
      pushFinding(findings, {
        id: "desc-structure-partial",
        severity: "low",
        message: `Missing section header(s): ${missingSections.join(", ")}.`,
      });
    }

    // Look for lines that start with a non-ASCII symbol (emoji / pictograph).
    const emojiHeaderCount = description.split(/\r?\n/).filter((line) => {
      const trimmed = line.trimStart();
      return trimmed.length > 0 && trimmed.charCodeAt(0) > 127;
    }).length;
    if (emojiHeaderCount === 0 && description.length > 200) {
      pushFinding(findings, {
        id: "desc-emoji-headers",
        severity: "low",
        message: "No emoji section headers detected in the description.",
      });
    }
  } else {
    pushFinding(findings, {
      id: "desc-empty",
      severity: "high",
      message: "Description is empty.",
    });
  }

  const basePrice = getDefaultBasePriceUsd();
  if (
    fields.price_amount != null &&
    Number.isFinite(fields.price_amount) &&
    Math.abs(fields.price_amount - basePrice) >= 1
  ) {
    pushFinding(findings, {
      id: "price-base",
      severity: "low",
      message: `Price $${fields.price_amount} differs from catalog base $${basePrice} (No background).`,
    });
  }

  let score = 100;
  for (const f of findings) {
    score -= SEVERITY_DEDUCTION[f.severity];
  }
  score = Math.max(0, Math.min(100, score));

  return { findings, suggestedTitle, score };
}

export function auditListing(listing: ShopListing): ListingAuditResult {
  const productType = inferProductType(listing);
  const { findings, suggestedTitle, score } = collectFindings({
    title: listing.title,
    tags: listing.tags || [],
    description: listing.description,
    price_amount: listing.price_amount,
    productType,
  });

  return {
    listing,
    score,
    findings,
    suggestedTitle,
    differentiationCount: 0, // filled in by auditShop
  };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  Array.from(a).forEach((x) => {
    if (b.has(x)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function auditShop(listings: ShopListing[]): ShopAuditResult {
  const active = listings.filter((l) => (l.state || "active") === "active");
  const perListing = active.map(auditListing);

  // Tag frequency across shop
  const tagToListings = new Map<string, number[]>();
  for (const l of active) {
    const seen = new Set<string>();
    for (const raw of l.tags || []) {
      const key = normalizeTagKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const arr = tagToListings.get(key) || [];
      arr.push(l.etsy_listing_id);
      tagToListings.set(key, arr);
    }
  }

  const evergreenSet = new Set(EVERGREEN_TAGS.map((t) => t.toLowerCase()));

  // Differentiation per listing
  const differentiation = active.map((l) => {
    const uniqueTags: string[] = [];
    for (const raw of l.tags || []) {
      const key = normalizeTagKey(raw);
      if (!key) continue;
      if ((tagToListings.get(key) || []).length === 1) {
        uniqueTags.push(key);
      }
    }
    return {
      etsy_listing_id: l.etsy_listing_id,
      title: l.title,
      uniqueTagCount: uniqueTags.length,
      uniqueTags,
    };
  });

  // Attach differentiation onto per-listing results
  const diffMap = new Map(
    differentiation.map((d) => [d.etsy_listing_id, d.uniqueTagCount])
  );
  for (const row of perListing) {
    row.differentiationCount =
      diffMap.get(row.listing.etsy_listing_id) ?? 0;
  }

  const tagCoverage: TagCoverage[] = Array.from(tagToListings.entries())
    .map(([tag, ids]) => ({
      tag,
      listingCount: ids.length,
      isEvergreen: evergreenSet.has(tag),
    }))
    .sort((a, b) => b.listingCount - a.listingCount || a.tag.localeCompare(b.tag));

  // Pairwise Jaccard
  const pairwise: PairOverlap[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const setA = new Set((a.tags || []).map(normalizeTagKey).filter(Boolean));
      const setB = new Set((b.tags || []).map(normalizeTagKey).filter(Boolean));
      const shared: string[] = [];
      Array.from(setA).forEach((t) => {
        if (setB.has(t)) shared.push(t);
      });
      pairwise.push({
        aId: a.etsy_listing_id,
        bId: b.etsy_listing_id,
        aTitle: a.title,
        bTitle: b.title,
        sharedTags: shared.sort(),
        jaccard: jaccard(setA, setB),
      });
    }
  }
  pairwise.sort((x, y) => y.jaccard - x.jaccard);

  const half = Math.max(1, Math.ceil(active.length / 2));
  const { titlePhrases } = computeKeywordStats(active);
  const titlePhraseOverlap: TitlePhraseOverlap[] = titlePhrases
    .filter((p) => p.count > half)
    .map((p) => ({
      term: p.term,
      count: p.count,
      share: active.length ? p.count / active.length : 0,
    }));

  perListing.sort((a, b) => a.score - b.score);
  differentiation.sort((a, b) => a.uniqueTagCount - b.uniqueTagCount);

  const highFindingCount = perListing.reduce(
    (n, row) => n + row.findings.filter((f) => f.severity === "high").length,
    0
  );
  const averageScore = perListing.length
    ? Math.round(
        (perListing.reduce((s, r) => s + r.score, 0) / perListing.length) * 10
      ) / 10
    : 0;

  return {
    perListing,
    cannibalization: {
      differentiation,
      tagCoverage,
      pairwise: pairwise.slice(0, 25),
      titlePhraseOverlap,
    },
    summary: {
      listingCount: active.length,
      averageScore,
      highFindingCount,
    },
  };
}
