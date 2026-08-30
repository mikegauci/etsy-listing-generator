import OpenAI from "openai";
import {
  listingOutputSchema,
  createOpenAiListingSchema,
  type GenerateInput,
  type ListingOutput,
  type ShopListing,
} from "./types";
import type { MarketplaceListing } from "./etsy";
import { getDefaultBasePriceUsd } from "./product-options";
import { ensureCustomTitlePrefix } from "./listing-title";
import { ensurePersonalizedTitlePrefix } from "./listing-title-shop";
import {
  buildSeoAltText,
  enrichDescriptionWithSeoTags,
  buildAltSeoPhrasePool,
} from "./seo-copy";
import { buildListingTags } from "./tags";
import { formatReferencedListing } from "./shop-listings";
import { getShop, type ShopConfig } from "./shops";
import { buildListingJsonSchema } from "./openai-schema";

function stripPricesFromDescription(text: string): string {
  return text
    .replace(/\(\+\$\d+(?:\.\d{2})?\)/g, "")
    .replace(/\(\$\d+(?:\.\d{2})?\)/g, "")
    .replace(/\+\$\d+(?:\.\d{2})?/g, "")
    .replace(/\$\d+(?:\.\d{2})?\s*(?:USD|usd)?/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finalizeTitle(
  rawTitle: string,
  shop: ShopConfig,
  productType: string
): string {
  if (shop.titlePrefix === "Personalized") {
    return ensurePersonalizedTitlePrefix(rawTitle, 140, productType, shop);
  }
  return ensureCustomTitlePrefix(rawTitle, 140, productType);
}

export async function generateWithOpenAI(
  input: GenerateInput,
  referenced: ShopListing[],
  trendingKeywords: string[] = [],
  marketplace: MarketplaceListing[] = [],
  shopId?: string | null
): Promise<ListingOutput> {
  const shop = getShop(shopId ?? input.shopId);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const client = new OpenAI({ apiKey, timeout: 90_000 });
  const listingSchema = buildListingJsonSchema(shop);

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: shop.buildSystemPrompt() },
      {
        role: "user",
        content: shop.buildUserPrompt({
          input,
          referenced,
          trendingKeywords,
          marketplace,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: listingSchema,
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `OpenAI returned invalid JSON: ${err instanceof Error ? err.message : "parse error"}`
    );
  }

  const slotCount = shop.mediaSlots.length;
  const schemaWithShop = createOpenAiListingSchema(slotCount);
  const rawParsed = schemaWithShop.safeParse(rawJson);
  if (!rawParsed.success) {
    console.error("[openai] schema mismatch", rawParsed.error.flatten());
    throw new Error("OpenAI response failed schema validation");
  }

  const parsed = rawParsed.data;

  if (!parsed.referencedListings?.length && referenced.length) {
    parsed.referencedListings = referenced.map(formatReferencedListing);
  }

  if (!parsed.suggestedPrice) {
    const base =
      input.price != null
        ? Number(input.price)
        : shop.basePriceUsd ?? getDefaultBasePriceUsd();
    parsed.suggestedPrice = `$${base.toFixed(2)} USD`;
  }

  if (!parsed.optionsNotes) {
    parsed.optionsNotes =
      input.optionsNotes ||
      "See listing variations for options and personalization.";
  }

  const title = finalizeTitle(parsed.title || "", shop, input.productType);
  const tags = buildListingTags({
    subject: input.subject,
    title,
    trending: trendingKeywords,
    candidates: parsed.tags || [],
    evergreenTags: shop.evergreenTags,
    nicheGenericWords: shop.nicheGenericWords,
    tagNiche: shop.tagNiche,
  });

  const description = enrichDescriptionWithSeoTags(
    stripPricesFromDescription(parsed.description).replace(/—/g, "-"),
    tags,
    shop.descriptionSeoCopy
  );

  const seoPhrases = buildAltSeoPhrasePool({
    subject: input.subject,
    title,
    tags,
    trending: trendingKeywords,
    extra: parsed.tags || [],
    nicheGenericWords: shop.nicheGenericWords,
    tagNiche: shop.tagNiche,
  });

  const rawAlts = parsed.mediaAltTexts || [];
  const mediaAltTexts = shop.mediaSlots.map((slot, i) => ({
    slot,
    altText: buildSeoAltText({
      subject: input.subject,
      product: input.productType,
      slot,
      slotIndex: i,
      tags,
      seoPhrases,
      title,
      trending: trendingKeywords,
      base: rawAlts[i]?.altText,
      slotVisuals: shop.slotVisuals,
      slotBonusPhrases: shop.slotBonusPhrases,
      brandName: shop.name,
      mediaAltTextMin: shop.mediaAltTextMin,
      mediaAltTextMax: shop.mediaAltTextMax,
      mediaSlots: shop.mediaSlots,
      nicheGenericWords: shop.nicheGenericWords,
      tagNiche: shop.tagNiche,
    }),
  }));

  const output: ListingOutput = {
    title,
    tags,
    description,
    altText: buildSeoAltText({
      subject: input.subject,
      product: input.productType,
      slotIndex: 0,
      tags,
      seoPhrases,
      title,
      trending: trendingKeywords,
      base: parsed.altText || title,
      slotVisuals: shop.slotVisuals,
      slotBonusPhrases: shop.slotBonusPhrases,
      brandName: shop.name,
      mediaAltTextMin: shop.mediaAltTextMin,
      mediaAltTextMax: shop.mediaAltTextMax,
      mediaSlots: shop.mediaSlots,
      nicheGenericWords: shop.nicheGenericWords,
      tagNiche: shop.tagNiche,
    }),
    mediaAltTexts,
    seoNotes: parsed.seoNotes || "",
    referencedListings: parsed.referencedListings || [],
    suggestedPrice: parsed.suggestedPrice,
    optionsNotes: parsed.optionsNotes,
  };

  const final = listingOutputSchema.safeParse(output);
  if (!final.success) {
    console.error("[openai] final output invalid", final.error.flatten());
    throw new Error("Generated listing failed validation");
  }

  return final.data;
}
