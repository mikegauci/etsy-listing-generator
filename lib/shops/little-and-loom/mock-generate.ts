import type { GenerateInput, ListingOutput, ShopListing } from "../../types";
import type { MarketplaceListing } from "../../etsy";
import { buildListingTags } from "../../tags";
import { formatReferencedListing } from "../../shop-listings";
import {
  buildAltSeoPhrasePool,
  buildSeoAltText,
  enrichDescriptionWithSeoTags,
} from "../../seo-copy";
import { ensurePersonalizedTitlePrefix } from "../../listing-title-shop";
import { getLoomSeoBriefForSubject } from "./checklist";
import { loomClosingCopy } from "../prompts/little-and-loom";
import {
  LOOM_EVERGREEN_TAGS,
  LOOM_MEDIA_SLOTS,
  LOOM_SLOT_VISUALS,
  loomSlotBonus,
} from "../slot-copy/little-and-loom";
import type { ShopConfig } from "../types";

const SECTION_DIVIDER = "____________________";

export function generateLoomMockListing(
  shop: ShopConfig,
  input: GenerateInput,
  referenced: ShopListing[],
  trendingKeywords: string[] = [],
  marketplace: MarketplaceListing[] = []
): ListingOutput {
  const subject = input.subject.trim();
  const product = input.productType.trim();
  const seoBrief = getLoomSeoBriefForSubject(subject);

  let rawTitle: string;
  if (seoBrief?.giftPrimary) {
    rawTitle = [seoBrief.lead, ...seoBrief.support.slice(0, 3)].join(", ");
  } else if (seoBrief) {
    const parts = [seoBrief.lead];
    if (seoBrief.niche[0]) parts.push(seoBrief.niche[0]);
    parts.push(...seoBrief.support.slice(0, 2));
    rawTitle = parts.join(", ");
  } else {
    const subjectForTitle =
      subject.replace(/^personalized\s+/i, "").trim() || subject;
    rawTitle = `${subjectForTitle} ${product}`;
  }

  const title = ensurePersonalizedTitlePrefix(rawTitle, 140, product, shop);

  const nicheForTags =
    subject
      .replace(/^personalized\s+/i, "")
      .replace(/\s+(blanket|swaddle)$/i, "")
      .trim() || subject;

  const marketplaceTagSeeds = marketplace
    .flatMap((m) => m.tags || [])
    .filter(Boolean)
    .slice(0, 6);

  const tags = buildListingTags({
    subject: nicheForTags,
    title,
    trending: trendingKeywords,
    candidates: [
      ...marketplaceTagSeeds,
      ...(seoBrief?.niche ?? []),
      ...(seoBrief?.support ?? []).slice(0, 2),
      `${nicheForTags.split(/\s+/)[0]} blanket`,
      `baby shower gift`,
      `custom name blanket`,
    ],
    count: 13,
    evergreenTags: [...LOOM_EVERGREEN_TAGS],
    nicheGenericWords: shop.nicheGenericWords,
  });

  const basePrice = input.price ?? shop.basePriceUsd;
  const suggestedPrice = `$${basePrice.toFixed(2)} USD`;

  const description = enrichDescriptionWithSeoTags(
    [
      `Looking for a personalized ${nicheForTags} ${product}? Soft fleece nursery blanket with custom artwork and optional embroidered name — a thoughtful baby shower or newborn gift.`,
      ``,
      SECTION_DIVIDER,
      ``,
      `👀 Mockup preview`,
      `• We prepare your design before production when applicable`,
      `• Review details and reach out if you'd like adjustments`,
      ``,
      SECTION_DIVIDER,
      ``,
      `🎨 Artwork & name`,
      `• Custom printed artwork on soft fleece`,
      `• Optional embroidered name below the design`,
      ``,
      SECTION_DIVIDER,
      ``,
      `✨ Details`,
      `• Product: ${product}`,
      `• Perfect for snuggles, stroller, crib, and photo props`,
      ``,
      SECTION_DIVIDER,
      ``,
      `🎨 Colour options`,
      `• Oatmeal Beige`,
      `• Chocolate Brown`,
      `• Baby Blue`,
      `• Baby Pink`,
      `• Olive Green`,
      ``,
      SECTION_DIVIDER,
      ``,
      `📸 Personalization`,
      `• Add the baby name at checkout`,
      `• Upload or describe your preferred artwork motif`,
      ``,
      SECTION_DIVIDER,
      ``,
      `🧺 Size & material`,
      `• Approx. 30 x 40 inches soft fleece blanket`,
      `• Machine wash cold, gentle cycle`,
      `• Tumble dry low`,
      ``,
      SECTION_DIVIDER,
      ``,
      `💬 Questions?`,
      `Message us for custom artwork requests or gift notes.`,
      ``,
      SECTION_DIVIDER,
      ``,
      `🏪 Explore the shop`,
      `Browse LittleAndLoomGifts for more personalized nursery blankets and baby gifts.`,
      ``,
      SECTION_DIVIDER,
      ``,
      loomClosingCopy(),
    ].join("\n"),
    tags
  );

  const seoPhrases = buildAltSeoPhrasePool({
    subject,
    title,
    tags,
    trending: trendingKeywords,
    extra: marketplaceTagSeeds,
    nicheGenericWords: shop.nicheGenericWords,
  });

  const altText = buildSeoAltText({
    subject,
    product,
    slotIndex: 0,
    tags,
    seoPhrases,
    title,
    trending: trendingKeywords,
    slotVisuals: LOOM_SLOT_VISUALS,
    slotBonusPhrases: loomSlotBonus,
    brandName: shop.name,
    mediaAltTextMax: shop.mediaAltTextMax,
    mediaAltTextMin: shop.mediaAltTextMin,
  });

  const mediaAltTexts = LOOM_MEDIA_SLOTS.map((slot, i) => ({
    slot,
    altText: buildSeoAltText({
      subject,
      product,
      slot,
      slotIndex: i,
      tags,
      seoPhrases,
      title,
      trending: trendingKeywords,
      slotVisuals: LOOM_SLOT_VISUALS,
      slotBonusPhrases: loomSlotBonus,
      brandName: shop.name,
      mediaAltTextMax: shop.mediaAltTextMax,
      mediaAltTextMin: shop.mediaAltTextMin,
    }),
  }));

  return {
    title,
    tags,
    description,
    altText,
    mediaAltTexts,
    seoNotes: `Mock generation for ${shop.name}. Marketplace comps: ${marketplace.length}. Trending: ${trendingKeywords.slice(0, 6).join(", ")}.`,
    referencedListings: referenced.map(formatReferencedListing),
    suggestedPrice,
    optionsNotes:
      input.optionsNotes ||
      "Personalization: custom name + artwork. Five fleece colour options.",
  };
}
