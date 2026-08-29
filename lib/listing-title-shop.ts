import {
  containsGarmentColor,
  isRecipientKeywordDump,
  stripGarmentColorsFromTitle,
  stripTitleFiller,
  trimTitleChars,
  trimTitleWords,
  TITLE_WORD_MAX,
} from "./listing-title";
import type { ShopConfig } from "./shops/types";

export function ensurePersonalizedTitlePrefix(
  title: string,
  max = 140,
  productType?: string,
  shop?: ShopConfig
): string {
  let t = stripTitleFiller(stripGarmentColorsFromTitle(title));
  if (!t) return shop?.titlePrefix || "Personalized";

  const prefix = shop?.titlePrefix || "Personalized";
  const giftLead = shop?.giftPrimaryLead;

  if (giftLead && new RegExp(`^${giftLead.replace(/\s+/g, "\\s+")}\\b`, "i").test(t)) {
    t = t.replace(new RegExp(`^${giftLead}`, "i"), giftLead);
  } else if (new RegExp(`^${prefix}\\b`, "i").test(t)) {
    t = t.replace(new RegExp(`^${prefix}\\b`, "i"), prefix);
  } else {
    t = `${prefix} ${t}`;
  }

  t = t
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((seg) => !isRecipientKeywordDump(seg))
    .join(", ");

  t = t
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim()
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  const extraPhrases = shop?.titleExtraPhrases(productType) ?? [
    "Baby Shower Gift",
    "New Baby Gift",
    "Custom Name Blanket",
  ];

  t = fillTitleWordBudgetWithPhrases(t, TITLE_WORD_MAX, extraPhrases);
  t = trimTitleWords(t, shop?.titleWordMax ?? TITLE_WORD_MAX);

  return trimTitleChars(t, max);
}

function fillTitleWordBudgetWithPhrases(
  title: string,
  targetWords: number,
  phrases: string[]
): string {
  const cleaned = title.replace(/\s+/g, " ").trim().replace(/,\s*$/, "");
  if (!cleaned) return cleaned;

  const used = new Set(
    cleaned
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
  );

  let result = cleaned;
  let total = cleaned.split(/\s+/).filter(Boolean).length;

  for (const phrase of phrases) {
    if (total >= targetWords) break;
    const words = phrase.split(/\s+/);
    const fresh = words.filter((w) => {
      const key = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      return key && !used.has(key) && key !== "for";
    });
    if (fresh.length < 2) continue;
    const room = targetWords - total;
    if (words.length > room) continue;
    result = `${result}, ${phrase}`;
    for (const w of words) {
      const key = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (key) used.add(key);
    }
    total += words.length;
  }

  return result.replace(/\s+/g, " ").trim().replace(/,\s*$/, "");
}

export function stripBlanketColorsFromTitle(title: string): string {
  return stripGarmentColorsFromTitle(title);
}

export { containsGarmentColor };
