import type { GenerateInput, ListingOutput, ShopListing } from "./types";
import type { MarketplaceListing } from "./etsy";
import {
  TSHIRT_COLORS,
  TSHIRT_SIZES,
  MEDIA_SLOTS,
  backgroundsByIds,
  formatCustomFieldsNotes,
  getDefaultBasePriceUsd,
  MEDIA_ALT_TEXT_MAX,
} from "./product-options";
import { ensureCustomTitlePrefix } from "./listing-title";
import { buildListingTags } from "./tags";
import { formatReferencedListing } from "./shop-listings";

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

const SECTION_DIVIDER = "____________________";

function backgroundBullets(input: GenerateInput): string[] {
  const themes = backgroundsByIds(input.backgroundIds || [])
    .filter((b) => b.id !== "no-background" && b.id !== "custom-background")
    .map((b) => b.label);
  const lines = [
    "• Choose a theme background, no background, or a custom background",
    "• Select your option at checkout",
  ];
  if (themes.length) {
    lines.splice(1, 0, `• Themes on this listing: ${themes.join(", ")}`);
  }
  return lines;
}

function buildOptionsNotes(input: GenerateInput): string {
  const parts: string[] = [];
  const bgs = backgroundsByIds(input.backgroundIds || []);
  if (bgs.length) {
    parts.push(
      "Backgrounds:\n" +
        bgs.map((b) => `- ${b.label} ($${b.priceUsd})`).join("\n")
    );
  }
  if (input.productType === "t-shirt") {
    parts.push(
      `Colors: ${TSHIRT_COLORS.join(", ")}\nSizes: ${TSHIRT_SIZES.join(", ")}`
    );
  }
  parts.push("Custom options:\n" + formatCustomFieldsNotes());
  if (input.optionsNotes?.trim()) {
    parts.push("Extra notes:\n" + input.optionsNotes.trim());
  }
  return parts.join("\n\n");
}

export function generateMockListing(
  input: GenerateInput,
  referenced: ShopListing[],
  trendingKeywords: string[] = [],
  marketplace: MarketplaceListing[] = []
): ListingOutput {
  const subject = input.subject.trim();
  const product = input.productType.trim();
  const colors = input.colors?.trim() || "Black, White";
  const media =
    input.mediaFiles?.length
      ? input.mediaFiles
      : input.imageName
        ? [{ name: input.imageName, kind: "image" as const }]
        : [];

  const bgs = backgroundsByIds(input.backgroundIds || []);
  const noBg = bgs.find((b) => b.id === "no-background");
  const basePrice =
    input.price != null
      ? Number(input.price)
      : noBg?.priceUsd ?? getDefaultBasePriceUsd();

  const garment =
    product === "t-shirt"
      ? "T-Shirt"
      : product.charAt(0).toUpperCase() + product.slice(1);
  // Subject may already be a full listing title (e.g. checklist "Custom JDM T-Shirt").
  const subjectForTitle = subject.replace(/^custom\s+/i, "").trim() || subject;
  const alreadyHasProduct =
    /\s+(t-?shirts?|tees?|hoodies?|sweatshirts?|tank\s*tops?|mugs?|posters?|stickers?|tote\s*bags?|phone\s*cases?|canvas\s*prints?|digital\s*downloads?)$/i.test(
      subjectForTitle
    );
  const title = ensureCustomTitlePrefix(
    alreadyHasProduct
      ? subjectForTitle
      : `${subjectForTitle} ${garment}`,
    140,
    product
  );

  const nicheForTags = subjectForTitle
    .replace(
      /\s+(t-?shirts?|tees?|hoodies?|sweatshirts?|tank\s*tops?|mugs?|posters?|stickers?|tote\s*bags?|phone\s*cases?|canvas\s*prints?|digital\s*downloads?)$/i,
      ""
    )
    .trim();
  const subjectWords = nicheForTags.split(/\s+/).filter(Boolean);
  const shortSubject =
    subjectWords.slice(0, 2).join(" ") || nicheForTags || subject;
  const headWord = subjectWords[0] || "car";

  const marketplaceTagSeeds = marketplace
    .flatMap((m) => m.tags || [])
    .filter(Boolean)
    .slice(0, 6);

  const tags = buildListingTags({
    subject: nicheForTags || subject,
    title,
    trending: trendingKeywords,
    candidates: [
      ...marketplaceTagSeeds,
      `${shortSubject} shirt`,
      `${headWord} car gift`,
      `${shortSubject} tee`,
    ],
  });

  const suggestedPrice = `$${basePrice.toFixed(2)} USD (No background)`;
  const optionsOut = buildOptionsNotes(input);

  const description = [
    `Looking for a custom ${nicheForTags || subject} ${product}? Personalized car-photo artwork made for enthusiasts and gift buyers.`,
    ``,
    SECTION_DIVIDER,
    ``,
    `👀 Mockup preview`,
    `• We send a mockup before anything goes to print`,
    `• Review it, request changes, and approve when you love it`,
    `• Not happy with the artwork? Full refund`,
    ``,
    SECTION_DIVIDER,
    ``,
    `👕 Front or back artwork`,
    `• Prints on the front or back - choose your side at checkout`,
    `• Want both sides? Contact us and we can help`,
    ``,
    SECTION_DIVIDER,
    ``,
    `✨ Details`,
    `• Product: ${product}`,
    `• Style: Custom car illustration from your photo`,
    `• Colors: ${colors}`,
    product === "t-shirt"
      ? `• Sizes: ${TSHIRT_SIZES.join(", ")}`
      : null,
    ``,
    SECTION_DIVIDER,
    ``,
    `🌆 Backgrounds`,
    ...backgroundBullets(input),
    ``,
    `📸 Personalization`,
    `• Upload up to 4 vehicle photos (optional)`,
    `• Add custom text to your artwork (optional)`,
    ``,
    SECTION_DIVIDER,
    ``,
    `🧺 Materials & care`,
    `• Premium blank garment (see variations for specs)`,
    `• Machine wash cold, inside out`,
    `• Tumble dry low; do not iron directly on the print`,
    ``,
    SECTION_DIVIDER,
    ``,
    `💬 Questions?`,
    `Message us anytime - multiple cars, people or pets in the design, or anything else. Happy to help.`,
    ``,
    `🏪 Explore the shop`,
    `Browse Motor Element for more custom car shirts, hoodies, and automotive gifts.`,
    ``,
    `Add to cart when you're ready.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const altText = truncate(
    `Custom car illustration of a ${subject} on a ${product}, ${colors} colorway, Motor Element automotive apparel`,
    MEDIA_ALT_TEXT_MAX
  );

  const referencedListings = referenced.map(formatReferencedListing);

  const seoNotes = [
    `Mock generation (USE_MOCK_GENERATION=true).`,
    `Title primary phrase "${subject} ${garment}" is front-loaded within first 40 chars.`,
    marketplace.length
      ? `Marketplace comps: ${marketplace.length} (top: ${marketplace
          .slice(0, 3)
          .map((m) => m.title.slice(0, 40))
          .join(" | ")}).`
      : "Marketplace comps: none.",
    trendingKeywords.length
      ? `Trending keywords: ${trendingKeywords.slice(0, 8).join(", ")}.`
      : "",
    `Backgrounds: ${bgs.map((b) => b.label).join(", ") || "none"}.`,
    media.length
      ? `Media context: ${media.map((m) => `${m.kind}:${m.name}`).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const mediaAltTexts = MEDIA_SLOTS.map((slot) => ({
    slot,
    altText: truncate(
      `Custom ${subject} ${garment} by Motor Element - ${slot.toLowerCase()} showing ${subject} automotive artwork, personalized car illustration style for enthusiasts and gift buyers looking for unique custom apparel`,
      MEDIA_ALT_TEXT_MAX
    ),
  }));

  return {
    title,
    tags,
    description,
    altText,
    mediaAltTexts,
    seoNotes,
    referencedListings,
    suggestedPrice,
    optionsNotes: optionsOut,
  };
}
