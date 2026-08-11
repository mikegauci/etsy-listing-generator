import { collectFindings, type Finding } from "./audit";
import type { MarketplaceListing } from "./etsy";
import { tokenizeTitle } from "./keywords";
import { ensureCustomTitlePrefix } from "./listing-title";
import {
  EVERGREEN_TAGS,
  TAG_COUNT,
  TAG_MAX_CHARS,
  buildListingTags,
  clampEtsyTag,
  formatTagsLine,
  isEvergreenTag,
  isMultiWord,
} from "./tags";
import type { ShopListing } from "./types";

export type SideMetrics = {
  titleWords: number;
  titleChars: number;
  tagCount: number;
  tagCharsUsed: number;
  tagCharsBudget: number;
  descriptionChars: number;
  price: number | null;
  views: number;
  favorites: number;
  ageDays: number | null;
  favoritesPerDay: number | null;
};

export type Recommendation = {
  summary: string;
  items: string[];
  rationale?: string;
};

export type CompareResult = {
  tags: {
    theirsOnly: string[];
    mineOnly: string[];
    shared: string[];
  };
  titleKeywords: {
    theirsOnly: string[];
    mineOnly: string[];
    shared: string[];
  };
  structural: {
    mine: SideMetrics;
    theirs: SideMetrics;
    priceDelta: number | null;
  };
  engagement: {
    mineFavorites: number;
    theirsFavorites: number;
    mineFavoritesPerDay: number | null;
    theirsFavoritesPerDay: number | null;
    viewsNote: string;
  };
  theirCompliance: {
    score: number;
    findings: Finding[];
    suggestedTitle: string | null;
  };
  recommendations: {
    tags: Recommendation;
    titleKeywords: Recommendation;
    structural: Recommendation;
    compliance: Recommendation;
    /** Full 13-tag set ready to paste (yours + stolen niche). */
    fullTagSet: string[];
    fullTagLine: string;
    /** Suggested title for your listing after weaving competitor keywords. */
    recommendedTitle: string | null;
  };
};

function normalizeKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function wordCount(title: string): number {
  return title.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

function tagCharStats(tags: string[]): { used: number; budget: number } {
  const used = tags.reduce((sum, t) => sum + t.length, 0);
  return { used, budget: tags.length * TAG_MAX_CHARS };
}

function ageDaysFromTimestamp(ts: number | null | undefined): number | null {
  if (ts == null || !Number.isFinite(ts) || ts <= 0) return null;
  // Etsy timestamps are unix seconds
  const createdMs = ts > 1e12 ? ts : ts * 1000;
  const days = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
  return days > 0 ? days : null;
}

function favoritesPerDay(
  favorites: number,
  ageDays: number | null
): number | null {
  if (ageDays == null || ageDays < 1) return null;
  return Math.round((favorites / ageDays) * 100) / 100;
}

function sideMetrics(
  listing: {
    title: string;
    tags: string[];
    description?: string | null;
    price_amount?: number | null;
    views?: number | null;
    num_favorers?: number | null;
    original_creation_timestamp?: number | null;
  }
): SideMetrics {
  const tags = listing.tags || [];
  const { used, budget } = tagCharStats(tags);
  const ageDays = ageDaysFromTimestamp(listing.original_creation_timestamp);
  const favorites = listing.num_favorers ?? 0;
  return {
    titleWords: wordCount(listing.title || ""),
    titleChars: (listing.title || "").length,
    tagCount: tags.length,
    tagCharsUsed: used,
    tagCharsBudget: budget,
    descriptionChars: (listing.description || "").length,
    price: listing.price_amount ?? null,
    views: listing.views ?? 0,
    favorites,
    ageDays: ageDays != null ? Math.round(ageDays * 10) / 10 : null,
    favoritesPerDay: favoritesPerDay(favorites, ageDays),
  };
}

function setDiff(a: string[], b: string[]): {
  onlyA: string[];
  onlyB: string[];
  shared: string[];
} {
  const setA = new Set(a.map(normalizeKey).filter(Boolean));
  const setB = new Set(b.map(normalizeKey).filter(Boolean));
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  const shared: string[] = [];

  // Preserve original casing from first list when possible
  const labelA = new Map<string, string>();
  for (const x of a) {
    const k = normalizeKey(x);
    if (k && !labelA.has(k)) labelA.set(k, x.trim());
  }
  const labelB = new Map<string, string>();
  for (const x of b) {
    const k = normalizeKey(x);
    if (k && !labelB.has(k)) labelB.set(k, x.trim());
  }

  Array.from(setA).forEach((k) => {
    if (setB.has(k)) shared.push(labelA.get(k) || k);
    else onlyA.push(labelA.get(k) || k);
  });
  Array.from(setB).forEach((k) => {
    if (!setA.has(k)) onlyB.push(labelB.get(k) || k);
  });

  onlyA.sort((x, y) => x.localeCompare(y));
  onlyB.sort((x, y) => x.localeCompare(y));
  shared.sort((x, y) => x.localeCompare(y));
  return { onlyA, onlyB, shared };
}

export function compareListings(
  mine: ShopListing,
  theirs: MarketplaceListing
): CompareResult {
  const myTags = mine.tags || [];
  const theirTags = theirs.tags || [];
  const tagGap = setDiff(myTags, theirTags);

  const myTitleKw = tokenizeTitle(mine.title || "");
  const theirTitleKw = tokenizeTitle(theirs.title || "");
  const titleGap = setDiff(myTitleKw, theirTitleKw);

  const mineMetrics = sideMetrics({
    title: mine.title,
    tags: myTags,
    description: mine.description,
    price_amount: mine.price_amount,
    views: mine.views,
    num_favorers: mine.num_favorers,
  });

  const theirsMetrics = sideMetrics({
    title: theirs.title,
    tags: theirTags,
    description: theirs.description,
    price_amount: theirs.price_amount,
    views: theirs.views,
    num_favorers: theirs.num_favorers,
    original_creation_timestamp: theirs.original_creation_timestamp,
  });

  let priceDelta: number | null = null;
  if (mineMetrics.price != null && theirsMetrics.price != null) {
    priceDelta =
      Math.round((mineMetrics.price - theirsMetrics.price) * 100) / 100;
  }

  const compliance = collectFindings({
    title: theirs.title,
    tags: theirTags,
    description: theirs.description,
    price_amount: theirs.price_amount,
    productType: "t-shirt",
  });

  const tags = {
    theirsOnly: tagGap.onlyB,
    mineOnly: tagGap.onlyA,
    shared: tagGap.shared,
  };
  const titleKeywords = {
    theirsOnly: titleGap.onlyB,
    mineOnly: titleGap.onlyA,
    shared: titleGap.shared,
  };
  const structural = {
    mine: mineMetrics,
    theirs: theirsMetrics,
    priceDelta,
  };
  const engagement = {
    mineFavorites: mineMetrics.favorites,
    theirsFavorites: theirsMetrics.favorites,
    mineFavoritesPerDay: mineMetrics.favoritesPerDay,
    theirsFavoritesPerDay: theirsMetrics.favoritesPerDay,
    viewsNote:
      "Etsy views are tabulated once daily for active listings and are often 0 via the API — favorites (and favorites/day) are the more trustworthy engagement signal.",
  };
  const theirCompliance = {
    score: compliance.score,
    findings: compliance.findings,
    suggestedTitle: compliance.suggestedTitle,
  };

  return {
    tags,
    titleKeywords,
    structural,
    engagement,
    theirCompliance,
    recommendations: buildRecommendations({
      mine,
      theirs,
      tags,
      titleKeywords,
      structural,
      engagement,
      theirCompliance,
      myTags,
    }),
  };
}

/** Steal up to 3 niche competitor tags into a full 13-tag pack. */
function buildFullRecommendedTags(
  myTags: string[],
  stealCandidates: string[],
  subject: string,
  title: string
): { fullSet: string[]; stealUsed: string[] } {
  const stealUsed: string[] = [];
  const seen = new Set<string>();

  for (const raw of stealCandidates) {
    if (stealUsed.length >= 3) break;
    const tag = clampEtsyTag(raw).toLowerCase();
    if (!tag || tag.length < 2) continue;
    if (!isMultiWord(tag)) continue;
    if (isEvergreenTag(tag)) continue;
    const key = normalizeKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    stealUsed.push(tag);
  }

  // Prefer packing through the same engine as Generate so evergreen stays consistent.
  const packed = buildListingTags({
    subject,
    title,
    candidates: [...stealUsed, ...myTags],
    trending: stealUsed,
  });

  // If packer dropped steal tags, force them into the front niche slots.
  if (stealUsed.length) {
    const out: string[] = [];
    const outSeen = new Set<string>();
    const push = (raw: string) => {
      if (out.length >= TAG_COUNT) return;
      const tag = clampEtsyTag(raw).toLowerCase();
      if (!tag || tag.length < 2) return;
      const key = normalizeKey(tag);
      if (outSeen.has(key)) return;
      outSeen.add(key);
      out.push(tag);
    };
    for (const t of stealUsed) push(t);
    for (const t of packed) push(t);
    for (const t of myTags) push(t);
    for (const t of EVERGREEN_TAGS) push(t);
    return { fullSet: out.slice(0, TAG_COUNT), stealUsed };
  }

  return { fullSet: packed.slice(0, TAG_COUNT), stealUsed };
}

/** Weave competitor title keywords into your title, then apply Motor Element rules. */
function buildRecommendedTitle(
  mineTitle: string,
  stealKeywords: string[],
  productType = "t-shirt"
): string | null {
  const base = (mineTitle || "").trim();
  if (!base) return null;

  const existing = base.toLowerCase();
  const inject: string[] = [];
  for (const raw of stealKeywords) {
    if (inject.length >= 2) break;
    const phrase = raw.replace(/\s+/g, " ").trim();
    if (!phrase || phrase.length < 3) continue;
    if (existing.includes(phrase.toLowerCase())) continue;
    // Skip single stop-ish tokens that don't add niche signal alone
    if (!phrase.includes(" ") && phrase.length < 5) continue;
    // Title-case lightly for display
    const pretty = phrase
      .split(" ")
      .map((w) =>
        w.length <= 2 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)
      )
      .join(" ");
    inject.push(pretty);
  }

  let draft = base;
  if (inject.length) {
    // Insert after the first comma segment so niche stays front-loaded.
    const parts = draft.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      draft = `${draft}, ${inject.join(", ")}`;
    } else {
      draft = [parts[0], ...inject, ...parts.slice(1)].join(", ");
    }
  }

  const finalized = ensureCustomTitlePrefix(draft, 140, productType);
  if (
    finalized.replace(/\s+/g, " ").trim().toLowerCase() ===
    base.replace(/\s+/g, " ").trim().toLowerCase()
  ) {
    // Still return the cleaned title if rules change it; else null only when identical after rules on base alone
    const cleanedOnly = ensureCustomTitlePrefix(base, 140, productType);
    if (
      cleanedOnly.replace(/\s+/g, " ").trim().toLowerCase() ===
      base.replace(/\s+/g, " ").trim().toLowerCase()
    ) {
      return inject.length ? finalized : cleanedOnly;
    }
    return finalized;
  }
  return finalized;
}

function buildRecommendations(opts: {
  mine: ShopListing;
  theirs: MarketplaceListing;
  tags: CompareResult["tags"];
  titleKeywords: CompareResult["titleKeywords"];
  structural: CompareResult["structural"];
  engagement: CompareResult["engagement"];
  theirCompliance: CompareResult["theirCompliance"];
  myTags: string[];
}): CompareResult["recommendations"] {
  const myTagCount = opts.myTags.length;

  // Prefer multi-word, non-evergreen competitor tags that fit the 20-char budget.
  const stealCandidates = opts.tags.theirsOnly
    .map((t) => clampEtsyTag(t).toLowerCase())
    .filter((t) => t.length >= 2)
    .filter((t) => isMultiWord(t))
    .filter((t) => !isEvergreenTag(t));

  // Title keywords: prefer phrases (have a space) and longer tokens.
  const recommendedTitleKw = [...opts.titleKeywords.theirsOnly]
    .sort((a, b) => {
      const aPhrase = a.includes(" ") ? 1 : 0;
      const bPhrase = b.includes(" ") ? 1 : 0;
      if (bPhrase !== aPhrase) return bPhrase - aPhrase;
      return b.length - a.length;
    })
    .slice(0, 6);

  const recommendedTitle = buildRecommendedTitle(
    opts.mine.title,
    recommendedTitleKw,
    "t-shirt"
  );

  const { fullSet, stealUsed } = buildFullRecommendedTags(
    opts.myTags,
    stealCandidates,
    opts.mine.title,
    recommendedTitle || opts.mine.title
  );
  const fullTagLine = formatTagsLine(fullSet);

  const tagRec: Recommendation =
    stealUsed.length > 0
      ? {
          summary:
            "Full tag set below — your evergreen core plus stolen niche phrases. Copy the whole line into Etsy.",
          items: stealUsed,
          rationale:
            myTagCount < TAG_COUNT
              ? `You only use ${myTagCount}/${TAG_COUNT} tags — empty slots were filled first.`
              : "Weakest niche slots were replaced; evergreen tags kept.",
        }
      : {
          summary:
            opts.tags.theirsOnly.length === 0
              ? "No new tags to steal — your tag set already covers theirs. Full set is your current pack cleaned to 13."
              : "Their unique tags are mostly single-word or evergreen — full set keeps your current niche.",
          items: [],
          rationale:
            "Long-tail multi-word niche tags outperform single words and duplicates of your evergreen core.",
        };

  const myWords = opts.structural.mine.titleWords;
  const titleRec: Recommendation =
    recommendedTitleKw.length > 0
      ? {
          summary:
            myWords < 10
              ? "Recommended title weaves their keywords into yours (you have word budget left)."
              : myWords > 14
                ? "Recommended title swaps weaker trailing segments for their keywords."
                : "Recommended title adds 1–2 of their front-loaded keywords after your niche.",
          items: recommendedTitleKw,
          rationale:
            "Keywords they front-load that you omit are the cheapest title experiment.",
        }
      : {
          summary: recommendedTitle
            ? "Title keyword coverage matches — recommended title is your listing cleaned to current SEO rules."
            : "Title keyword coverage already matches theirs closely.",
          items: [],
        };

  const structuralItems: string[] = [];
  const mine = opts.structural.mine;
  const theirs = opts.structural.theirs;

  if (mine.tagCount < TAG_COUNT) {
    structuralItems.push(`Fill all ${TAG_COUNT} tag slots (you have ${mine.tagCount})`);
  }
  if (
    mine.tagCharsBudget > 0 &&
    mine.tagCharsUsed / mine.tagCharsBudget < 0.7 &&
    theirs.tagCharsBudget > 0 &&
    theirs.tagCharsUsed / theirs.tagCharsBudget >
      mine.tagCharsUsed / mine.tagCharsBudget + 0.1
  ) {
    structuralItems.push(
      `Use more of the ${TAG_MAX_CHARS}-char tag budget (you: ${mine.tagCharsUsed}/${mine.tagCharsBudget}, them: ${theirs.tagCharsUsed}/${theirs.tagCharsBudget})`
    );
  }
  if (mine.titleWords < 13) {
    structuralItems.push(
      `Expand title toward 13–16 words (you: ${mine.titleWords}, them: ${theirs.titleWords})`
    );
  } else if (mine.titleWords > 16) {
    structuralItems.push(
      `Trim title to ≤16 words (you: ${mine.titleWords}, them: ${theirs.titleWords})`
    );
  }
  if (
    theirs.descriptionChars > mine.descriptionChars * 1.25 &&
    opts.engagement.theirsFavorites > opts.engagement.mineFavorites
  ) {
    structuralItems.push(
      `Their description is longer and they have more favorites — expand yours with clearer sections (you: ${mine.descriptionChars} chars, them: ${theirs.descriptionChars})`
    );
  }
  if (
    opts.structural.priceDelta != null &&
    opts.structural.priceDelta > 5 &&
    opts.engagement.theirsFavoritesPerDay != null &&
    opts.engagement.mineFavoritesPerDay != null &&
    opts.engagement.theirsFavoritesPerDay >
      opts.engagement.mineFavoritesPerDay * 1.2
  ) {
    structuralItems.push(
      `You are $${opts.structural.priceDelta} higher with weaker favorites/day — review whether price or perceived value is the gap`
    );
  } else if (
    opts.structural.priceDelta != null &&
    opts.structural.priceDelta < -5
  ) {
    structuralItems.push(
      `You are $${Math.abs(opts.structural.priceDelta)} cheaper — room to raise if quality signals match`
    );
  }
  if (
    opts.engagement.theirsFavoritesPerDay != null &&
    opts.engagement.mineFavoritesPerDay != null &&
    opts.engagement.theirsFavoritesPerDay >
      opts.engagement.mineFavoritesPerDay * 1.5
  ) {
    structuralItems.push(
      `They earn ~${opts.engagement.theirsFavoritesPerDay} favs/day vs your ${opts.engagement.mineFavoritesPerDay} — prioritize tag + title experiments above`
    );
  }

  const structuralRec: Recommendation =
    structuralItems.length > 0
      ? {
          summary: "Structural moves most likely to close the gap:",
          items: structuralItems,
          rationale: opts.engagement.viewsNote,
        }
      : {
          summary: "Structure looks competitive — no urgent metric gaps.",
          items: [],
        };

  const highFindings = opts.theirCompliance.findings.filter(
    (f) => f.severity === "high"
  );
  const complianceItems: string[] = [];

  if (opts.theirCompliance.score >= 75) {
    complianceItems.push(
      "Their listing already fits your SEO conventions — safe to mirror structure while stealing niche keywords above"
    );
  } else if (highFindings.length > 0) {
    complianceItems.push(
      `Do not copy their weak spots: ${highFindings
        .slice(0, 3)
        .map((f) => f.message.replace(/\.$/, ""))
        .join("; ")}`
    );
    complianceItems.push(
      "Steal their niche keywords, then rewrite under your Custom-prefix / 13-tag / emoji-section rules"
    );
  } else {
    complianceItems.push(
      "Mild rule drift on their side — take keywords selectively, keep your title/tag/description conventions"
    );
  }

  if (
    opts.engagement.theirsFavorites > opts.engagement.mineFavorites * 2 &&
    opts.theirCompliance.score < 60
  ) {
    complianceItems.push(
      "They outperform you despite breaking your rules — demand for the niche is real; your differentiation should come from better SEO + artwork, not copying stuffing"
    );
  }

  const complianceRec: Recommendation = {
    summary:
      opts.theirCompliance.score >= 75
        ? "Recommended approach: adopt their niche language inside your rule set."
        : "Recommended approach: take keywords, ignore their SEO shortcuts.",
    items: complianceItems,
  };

  return {
    tags: tagRec,
    titleKeywords: titleRec,
    structural: structuralRec,
    compliance: complianceRec,
    fullTagSet: fullSet,
    fullTagLine,
    recommendedTitle,
  };
}
