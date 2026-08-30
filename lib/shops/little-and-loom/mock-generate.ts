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
import {
  LOOM_SECTION_HEADINGS,
  loomBlanketColorsBlock,
  loomCareInstructionsBlock,
  loomClosingCopy,
  loomDesignOptionsBlock,
  loomHowToPersonalizeBlock,
  loomPerfectForBlock,
  loomProductDetailsBlock,
  loomTextColorsBlock,
} from "./product-facts";
import {
  LOOM_EVERGREEN_TAGS,
  LOOM_MEDIA_SLOTS,
  LOOM_SLOT_VISUALS,
  loomSlotBonus,
} from "../slot-copy/little-and-loom";
import type { ShopConfig } from "../types";

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
    tagNiche: shop.tagNiche,
  });

  const basePrice = input.price ?? shop.basePriceUsd;
  const suggestedPrice = `$${basePrice.toFixed(2)} USD`;

  const description = enrichDescriptionWithSeoTags(
    [
      `🧸 PERSONALIZED ${nicheForTags.toUpperCase()} BABY BLANKET 🧸`,
      ``,
      `Wrap your little one in a soft, cozy blanket made especially for them.`,
      ``,
      `This personalized baby blanket features ${nicheForTags} artwork paired with your baby's name for a sweet and meaningful keepsake.`,
      ``,
      `Choose your preferred blanket color, personalization style and text color to create a blanket that feels completely unique.`,
      ``,
      `Made from ultra-soft velveteen microfiber, it's perfect for cuddle time, stroller rides, nursery moments, milestone photos and cozy days at home.`,
      ``,
      `Whether you're shopping for a baby shower gift, newborn gift or something special for your own little one, this custom baby name blanket makes a beautiful keepsake for years to come.`,
      ``,
      LOOM_SECTION_HEADINGS.whyYoullLoveIt,
      ``,
      `• Personalized with your baby's name`,
      `• Sweet ${nicheForTags} artwork`,
      `• Choose from five beautiful blanket colors`,
      `• Multiple personalization options`,
      `• Ultra-soft velveteen plush feel`,
      `• Lightweight, warm and comfortable`,
      `• Vibrant one-sided print`,
      `• Reinforced stitched edges`,
      `• A thoughtful personalized baby gift`,
      `• Available in three blanket sizes`,
      ``,
      loomBlanketColorsBlock(),
      ``,
      loomDesignOptionsBlock(),
      ``,
      loomTextColorsBlock(),
      ``,
      loomHowToPersonalizeBlock(),
      ``,
      loomPerfectForBlock(),
      ``,
      loomProductDetailsBlock(),
      ``,
      `🌸 A SWEET KEEPSAKE MADE JUST FOR THEM`,
      ``,
      `A baby's name is one of the first things chosen especially for them, and this blanket turns that name into something they can cuddle, photograph and keep.`,
      ``,
      `The ${nicheForTags} design creates a warm nursery feel, while the personalized name makes every blanket completely unique.`,
      ``,
      `From quiet mornings and stroller adventures to milestone photos and cozy family moments, it's designed to become part of those little memories worth holding onto.`,
      ``,
      loomCareInstructionsBlock(),
      ``,
      loomClosingCopy(),
    ].join("\n"),
    tags,
    shop.descriptionSeoCopy
  );

  const seoPhrases = buildAltSeoPhrasePool({
    subject,
    title,
    tags,
    trending: trendingKeywords,
    extra: marketplaceTagSeeds,
    nicheGenericWords: shop.nicheGenericWords,
    tagNiche: shop.tagNiche,
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
    nicheGenericWords: shop.nicheGenericWords,
    tagNiche: shop.tagNiche,
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
      nicheGenericWords: shop.nicheGenericWords,
      tagNiche: shop.tagNiche,
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
    optionsNotes: input.optionsNotes || shop.formatCustomFieldsNotes(),
  };
}
