import type { GenerateInput, ListingOutput, ShopListing } from "./types";
import type { MarketplaceListing } from "./etsy";
import {
  TSHIRT_COLORS,
  TSHIRT_SIZES,
  MEDIA_SLOTS,
  backgroundsByIds,
  formatBackgroundMarketingCopy,
  formatCustomFieldsNotes,
  MEDIA_ALT_TEXT_MAX,
} from "./product-options";

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

function tag(phrase: string): string {
  return phrase.replace(/\s+/g, " ").trim().slice(0, 20);
}

function uniqueTags(candidates: string[]): string[] {
  const seenWords = new Set<string>();
  const out: string[] = [];

  for (const raw of candidates) {
    const t = tag(raw);
    if (!t || t.length < 2) continue;
    const words = t.toLowerCase().split(/\s+/);
    if (words.some((w) => seenWords.has(w))) continue;
    words.forEach((w) => seenWords.add(w));
    out.push(t);
    if (out.length === 13) break;
  }

  const fillers = [
    "car culture art",
    "garage wall decor",
    "auto enthusiast",
    "racing inspired",
    "driver gift idea",
    "motorsport merch",
    "custom car print",
    "tuner lifestyle",
    "street racing vibe",
    "classic car fan",
    "automotive apparel",
    "car guy present",
    "jdm style wear",
    "boost culture tee",
    "midnight cruise art",
    "shift knobs vibe",
    "track day merch",
    "vintage racer look",
    "stance nation art",
    "engine bay print",
  ];
  for (const f of fillers) {
    if (out.length === 13) break;
    const t = tag(f);
    const words = t.toLowerCase().split(/\s+/);
    if (words.some((w) => seenWords.has(w))) continue;
    words.forEach((w) => seenWords.add(w));
    out.push(t);
  }

  let n = 1;
  while (out.length < 13) {
    const t = tag(`auto art piece ${n}`);
    n += 1;
    const words = t.toLowerCase().split(/\s+/);
    if (words.some((w) => seenWords.has(w))) continue;
    words.forEach((w) => seenWords.add(w));
    out.push(t);
  }

  return out.slice(0, 13);
}

function backgroundSection(input: GenerateInput): string {
  return formatBackgroundMarketingCopy(input.backgroundIds || []);
}

const SECTION_DIVIDER = "____________________";

const MOCKUP_GUARANTEE = `Every order includes a mockup preview before we submit your design to printing. Review it, request changes, and approve when you love it. Not happy with the artwork? We offer a full refund.`;

const CONTACT_CUSTOM = `Want multiple cars in a single artwork, people or pets in the design, or have another question? Contact us before or after ordering - we're happy to help.`;

const FRONT_BACK_ARTWORK = `Your custom artwork is printed on both the front and back of the garment for a bold, all-around look.`;

const VISIT_SHOP = `Love this design? Browse our Motor Element shop for more custom car shirts, hoodies, and automotive gifts.`;

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
    input.price != null ? Number(input.price) : noBg?.priceUsd ?? 43;

  const garment =
    product === "t-shirt"
      ? "T-Shirt"
      : product.charAt(0).toUpperCase() + product.slice(1);
  const primaryColor = colors.split(",")[0]?.trim() || "Black";
  const titleCore = `Custom ${subject} ${garment}, ${primaryColor}, Car Guy Gift`;
  const title = truncate(titleCore.replace(/\s+/g, " ").trim(), 140);

  const subjectWords = subject.split(/\s+/).filter(Boolean);
  const shortSubject = subjectWords.slice(0, 2).join(" ") || subject;

  const marketplaceTagSeeds = marketplace
    .flatMap((m) => m.tags || [])
    .filter(Boolean)
    .slice(0, 12);

  const tags = uniqueTags([
    ...trendingKeywords.slice(0, 6),
    ...marketplaceTagSeeds,
    `${shortSubject} ${product}`,
    `${subjectWords[0] || "car"} shirt`,
    "jdm car gift",
    "custom car art",
    "car guy gift",
    "automotive apparel",
    `${product} for him`,
    "garage decor gift",
    "tuner car merch",
    "motorsport tee",
    "custom car print",
    "race inspired wear",
    "car culture clothing",
    `${colors.split(",")[0].trim()} car tee`,
  ]);

  const suggestedPrice = `$${basePrice.toFixed(2)} USD (No background)`;
  const optionsOut = buildOptionsNotes(input);
  const bgBlock = backgroundSection(input);

  const description = [
    `Looking for the perfect ${subject} ${product}? This custom car illustration is made for car enthusiasts and gift buyers.`,
    ``,
    `Personalized ${subject} design - Motor Element style, matching our custom car apparel catalog.`,
    ``,
    SECTION_DIVIDER,
    ``,
    `✨ Mockup preview`,
    MOCKUP_GUARANTEE,
    ``,
    SECTION_DIVIDER,
    ``,
    `🎨 Front & back artwork`,
    FRONT_BACK_ARTWORK,
    ``,
    SECTION_DIVIDER,
    ``,
    `👕 Details`,
    `• Product: ${product}`,
    `• Style: Custom car illustration (Motor Element catalog)`,
    `• Color / variants: ${colors}`,
    product === "t-shirt"
      ? `• Garment: ${TSHIRT_COLORS.join(" / ")} · sizes ${TSHIRT_SIZES.join(", ")}`
      : null,
    ``,
    SECTION_DIVIDER,
    ``,
    `🖼️ Backgrounds`,
    bgBlock || null,
    ``,
    `✏️ Personalization`,
    `• Upload car photo/s (optional, up to 4 files)`,
    `• Add text to your artwork (optional)`,
    ``,
    SECTION_DIVIDER,
    ``,
    `🧼 Materials & care`,
    `• Premium blank garment / print surface (see listing variations for exact specs)`,
    `• Machine wash cold, inside out; tumble dry low`,
    `• Do not iron directly on the print`,
    ``,
    `🎁 Gift-ready for birthdays, garage unveilings, track days, and fellow car obsessives.`,
    ``,
    SECTION_DIVIDER,
    ``,
    `💬 Questions?`,
    CONTACT_CUSTOM,
    ``,
    SECTION_DIVIDER,
    ``,
    `🏪 Explore the shop`,
    VISIT_SHOP,
    ``,
    `Add to cart and gear up. 🚗`,
    referenced.length || marketplace.length
      ? `\n(Context: ${referenced.length} shop comps, ${marketplace.length} marketplace comps used in mock mode.)`
      : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const altText = truncate(
    `Custom car illustration of a ${subject} on a ${product}, ${colors} colorway, Motor Element automotive apparel`,
    MEDIA_ALT_TEXT_MAX
  );

  const referencedListings = referenced.map(
    (r) =>
      `${r.etsy_listing_id}: ${r.title}${
        r.price_amount != null
          ? ` (${r.price_amount} ${r.price_currency || "USD"})`
          : ""
      }`
  );

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
      `Custom ${subject} ${garment} by Motor Element - ${slot.toLowerCase()} showing ${subject} automotive artwork in ${primaryColor}, personalized car illustration style for enthusiasts and gift buyers looking for unique custom apparel`,
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
