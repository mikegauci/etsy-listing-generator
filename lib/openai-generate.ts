import OpenAI from "openai";
import {
  listingOutputSchema,
  openaiListingSchema,
  type GenerateInput,
  type ListingOutput,
  type ShopListing,
} from "./types";
import type { MarketplaceListing } from "./etsy";
import {
  TSHIRT_COLORS,
  TSHIRT_SIZES,
  MEDIA_SLOTS,
  backgroundsByIds,
  formatBackgroundMarketingCopy,
  formatCustomFieldsNotes,
  getDefaultBasePriceUsd,
  MEDIA_ALT_TEXT_MAX,
  MEDIA_ALT_TEXT_MIN,
} from "./product-options";
import { ensureCustomTitlePrefix } from "./listing-title";
import { buildListingTags, EVERGREEN_TAGS, TAG_MAX_CHARS } from "./tags";
import {
  formatReferencedListing,
  resolveMediaContext,
} from "./shop-listings";

const LISTING_JSON_SCHEMA = {
  name: "etsy_listing",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 4,
      },
      description: { type: "string" },
      altText: { type: "string" },
      mediaAltTexts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            slot: { type: "string" },
            altText: { type: "string" },
          },
          required: ["slot", "altText"],
        },
        minItems: MEDIA_SLOTS.length,
        maxItems: MEDIA_SLOTS.length,
      },
      seoNotes: { type: "string" },
      referencedListings: {
        type: "array",
        items: { type: "string" },
      },
      suggestedPrice: { type: "string" },
      optionsNotes: { type: "string" },
    },
    required: [
      "title",
      "tags",
      "description",
      "altText",
      "mediaAltTexts",
      "seoNotes",
      "referencedListings",
      "suggestedPrice",
      "optionsNotes",
    ],
  },
} as const;

function truncateAlt(str: string, max = MEDIA_ALT_TEXT_MAX): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + "…";
}

function avgCompPrice(referenced: ShopListing[]): string | null {
  const priced = referenced.filter((r) => r.price_amount != null);
  if (!priced.length) return null;
  const avg =
    priced.reduce((s, r) => s + Number(r.price_amount), 0) / priced.length;
  const currency = priced[0].price_currency || "USD";
  return `${avg.toFixed(2)} ${currency}`;
}

function buildSystemPrompt(): string {
  return `You are an expert Etsy SEO copywriter for Motor Element. Match THIS SHOP'S EXISTING CATALOG for description structure and brand voice, while borrowing winning title/tag phrasing from high-engagement marketplace comps when they fit.

## Compare marketplace vs your shop (required)
- You receive YOUR shop examples AND live marketplace comps for the same niche keyword.
- Titles & tags: prefer patterns that appear often among high-engagement marketplace comps (views/favorites) when they still fit Motor Element (custom car photo shirts, gift framing). Do not copy another shop's brand name or unique slogans.
- Description: ALWAYS keep Motor Element process/voice from YOUR shop examples (mockup preview, front or back artwork, backgrounds, contact, shop CTA). Never copy competitor process, policies, or digital-download language.
- In seoNotes: briefly say which marketplace vs shop patterns drove the title and tags.

## 2026 Etsy description SEO (must follow)
- First ~160 characters are highest priority (Etsy snippet + Google meta). Lead with the niche primary keyword + product type + buyer intent in sentence 1 (e.g. "Custom Ford Mustang t-shirt"). Keep the opening paragraph plain text (no emoji in the first ~160 chars).
- Align title, opening description, and tags on the SAME primary niche phrase.
- Write natural complete sentences; weave long-tail keywords into useful info. NEVER dump comma-separated keyword lists at the bottom.
- Aim ~200–350 words. Prefer short paragraphs (1–2 sentences) and bullets — never a wall of text.
- Do not start with "Welcome to my shop" or empty greetings.

## Description readability (required — Etsy tips)
- Use short paragraphs OR bullets. Break essentials into bullets: materials, sizes, colors, personalization, care.
- Proper punctuation; no ALL CAPS; no keyword stuffing.
- Emojis: REQUIRED on every section header (exactly 1 leading emoji + space + title). Do NOT put emojis in the opening paragraph, bullets, or body sentences.
- Avoid long prose blocks. If a section needs more than 2 sentences, convert the rest to bullets.
- Clear structure helps shoppers decide faster on mobile.

## Description formatting (required)
- After the short opening paragraph, separate major sections with a divider line: \`____________________\`
- Section headings MUST start with one emoji, e.g. \`👀 Mockup preview\`, \`👕 Front or back artwork\`, \`✨ Details\`, \`🌆 Backgrounds\`, \`📸 Personalization\`, \`🧺 Materials & care\`, \`💬 Questions?\`, \`🏪 Explore the shop\`
- Keep Motor Element voice; formatting should feel clean and scannable, not dense or meme-y.

## Catalog voice (mirror YOUR shop examples)
- Opening: keyword-rich hook like your top Custom Car Shirt / Hoodie listings — niche subject named early, gift framing, what you do (vector / cartoon-style custom art from photos).
- Then: what makes it special — we send a mockup to preview before anything goes to printing; full refund if you do not like the artwork (state this clearly in the description).
- Then: artwork placement — REQUIRED: custom artwork is printed on the front OR back of the garment (buyer chooses one side). If they want both sides, they should contact the shop. Never say it is printed on both front and back by default.
- Then: Background options — REQUIRED copy: buyers can choose from 9 different backgrounds, no background, or a customized background (no prices in description). You may name theme examples from the listing; do not list dollar amounts.
- Then: colors/sizes + materials/care + soft CTA. Keep Motor Element process language (mockup preview, approve/request changes, photo via order).
- Before the CTA: invite buyers to message/contact the shop for more info — e.g. multiple cars in one artwork, adding people or pets, or any other questions (required in every description).
- End with a shop visit CTA — REQUIRED: invite buyers to browse the Motor Element store for more custom car apparel and related products (word naturally, e.g. "Explore our shop for more designs" — not stiff or salesy).
- Title (follow Etsy’s official tips + shop voice + marketplace winners):
  • ALWAYS start with the word "Custom" as the first word (e.g. "Custom Ford Mustang T-Shirt, Personalized Car Photo Shirt, Gift for Him"). Never lead with the niche, product type, or any other word.
  • Clearly state what you’re selling (t-shirt, hoodie, mug, etc.) — not vague “art” alone.
  • Put the most important traits upfront in the first ~40 chars after Custom: niche subject + product type.
  • Prefer close to 14 words (Etsy title tip) — aim for 10–14 natural words. Hard max 140 characters.
  • Preferred title pattern: Custom {niche} {Product}, Personalized Car Photo {Product}, Gift for Him — match the product type (do not say Shirt for mugs/posters).
  • NEVER keyword-stuff recipients or occasions into one blob (forbidden: "Birthday Gift for Him Dad Boyfriend Men", "Gift for Him Dad Boyfriend"). One clean gift phrase is enough — evergreen tags already cover dad/boyfriend.
  • If the niche is long, keep Custom + niche + product first and drop the trailing gift phrase so you stay ≤14.
  • NEVER include garment colors in the title or tags (no Black, White, color names, or color lists). Colors belong only in the description variants section.
  • NEVER put description concepts in the title: no "front", "back", "front & back", "apparel", "illustration", "vehicle", "owners", or "guy". Front/back print belongs only in the description artwork section.
  • Keep it scannable with commas separating trait groups like existing shop titles.
  • Do NOT repeat the same word twice; move subjective hype (“perfect”, “beautiful”, “amazing”) to the description.
  • Only mention holidays/recipients when essential to the item (e.g. “Father’s Day gift” only if that’s the hook).
  • Never include price, shipping, discounts, or sales language in the title.
  • Match comma rhythm of shop examples while obeying the rules above.
- Tags: return ONLY 3 niche-specific tags for this subject (each ≤20 chars; a 4th backup is OK). Do NOT include the evergreen set below — the system always appends all 10. Niche tags MUST echo important title keywords (make/model + product/gift angles from the title). Prefer trending Etsy search terms and marketplace tag patterns when they fit. Exact-phrase duplicates are not allowed; shared words across tags are OK. NEVER use color names in tags.
- Fixed evergreen tags (appended automatically — do not output these): ${EVERGREEN_TAGS.join(", ")}
- If niche-specific shop examples exist (e.g. Ford), blend those with marketplace phrasing. If none, use marketplace title/tag patterns + top Custom Car product-type shop listings as the structural template.
- Avoid restricted/trademarked claims; do not invent licensed OEM branding.
- description field: NEVER include prices, dollar amounts, or "+$X" fees — mention backgrounds and options by name only.
- description field: NEVER use em dashes. Use commas, periods, or regular hyphens (-) instead.
- suggestedPrice / optionsNotes: may include prices for internal/seller reference; optionsNotes is separate from description.
- Media filenames are context only`;
}

function buildUserPrompt(
  input: GenerateInput,
  referenced: ShopListing[],
  trendingKeywords: string[] = [],
  marketplace: MarketplaceListing[] = []
): string {
  const examples =
    referenced.length === 0
      ? "No shop listings available. Use Motor Element custom car apparel title pattern: niche subject + product + personalized/gift phrasing."
      : referenced
          .map((r, i) => {
            const price =
              r.price_amount != null
                ? ` price=${r.price_amount} ${r.price_currency || "USD"}`
                : "";
            return `${i + 1}. id=${r.etsy_listing_id} views=${r.views} favs=${r.num_favorers} state=${r.state}${price}\nTitle: ${r.title}\nTags: ${(r.tags || []).join(", ")}\nDesc excerpt: ${(r.description || "").slice(0, 900)}`;
          })
          .join("\n\n");

  const marketplaceBlock =
    marketplace.length === 0
      ? "No marketplace comps available for this run — rely on shop examples, subject keywords, and trending search terms."
      : marketplace
          .map((r, i) => {
            const price =
              r.price_amount != null
                ? ` price=${r.price_amount} ${r.price_currency || "USD"}`
                : "";
            const tags =
              r.tags?.length > 0
                ? r.tags.join(", ")
                : "(tags not returned by API)";
            return `${i + 1}. id=${r.listing_id} shop=${r.shop_id ?? "?"} views=${r.views} favs=${r.num_favorers}${price}\nTitle: ${r.title}\nTags: ${tags}\nDesc excerpt: ${(r.description || "").slice(0, 500)}`;
          })
          .join("\n\n");

  const media = resolveMediaContext(input);

  const avg = avgCompPrice(referenced);
  const bgs = backgroundsByIds(input.backgroundIds || []);
  const backgroundMarketing = formatBackgroundMarketingCopy(
    input.backgroundIds || []
  );
  const bgLinesForOptionsNotes = bgs
    .map((b) => `- ${b.label}: $${b.priceUsd.toFixed(2)}`)
    .join("\n");

  const tshirtBlock =
    input.productType === "t-shirt"
      ? `T-shirt variants (must mention):\n- Colors: ${TSHIRT_COLORS.join(", ")}\n- Sizes: ${TSHIRT_SIZES.join(", ")}`
      : "Not a t-shirt — skip garment Color×Size matrix.";

  const titleTemplates = referenced
    .slice(0, 5)
    .map((r) => `- ${r.title}`)
    .join("\n");

  const marketplaceTitles = marketplace
    .slice(0, 5)
    .map((r) => `- ${r.title}`)
    .join("\n");

  const trendingBlock =
    trendingKeywords.length > 0
      ? `Trending Etsy search terms for this niche (weave into title, tags, and description naturally — prefer for tags/title when they fit; do not keyword-stuff):
${trendingKeywords.join(", ")}`
      : "Trending Etsy search terms: none available for this run — rely on shop examples, marketplace comps, and subject keywords.";

  const basePrice =
    input.price != null ? input.price : getDefaultBasePriceUsd();

  return `Write a listing that belongs in this shop's catalog for this niche subject. Compare marketplace comps vs your shop examples to choose the strongest title and tags.

Subject / niche keywords (MUST appear in title + first ~160 chars of description): ${input.subject}
Product type: ${input.productType}
Color/variants text (description / options only — NEVER put colors in title or tags): ${input.colors || "Black, White"}
Base / No-background price (USD): ${basePrice}
Extra seller notes: ${input.optionsNotes || "none"}
Reference media (context only): ${media}
Avg matched shop-comp price: ${avg || "n/a"}

${trendingBlock}

Marketplace title patterns (borrow phrasing patterns that fit Motor Element — do not copy brand names):
${marketplaceTitles || "(none)"}

Title templates from YOUR shop (adapt for "${input.subject}" — first word MUST be Custom; aim for 10–14 clean words, max 140 chars; NEVER stuff Birthday/Dad/Boyfriend/Men into one phrase; NEVER include colors, front/back print language, apparel, illustration, vehicle, owners, or guy; follow Etsy title rules above):
${titleTemplates || `(none — e.g. Custom Ford Mustang T-Shirt, Personalized Car Photo Shirt, Gift for Him)`}

Niche tags only (tags field): return 3 niche-specific tags for "${input.subject}" (≤${TAG_MAX_CHARS} chars each; optional 4th backup OK). The system appends these evergreen tags automatically — do not include them: ${EVERGREEN_TAGS.join(", ")}

Description structure (description field only — NO prices anywhere in description). Keep it easy to read: short opening, then bullets under each heading. No walls of text, no ALL CAPS. One emoji on each section header only.
1) One short keyword-first opening paragraph (subject + product + gift intent) — first 160 chars matter most; NO emoji
2) Divider \`____________________\`, then section headings with one leading emoji each
3) 👀 Mockup preview — bullets: mockup before print; request changes; full refund if they dislike the artwork
4) 👕 Front or back artwork — bullets: front OR back (choose at checkout); contact shop for both sides. Do NOT say both sides are included by default
5) ✨ Details — bullets for product, style, colors, sizes
6) 🌆 Backgrounds — short bullets (no prices): ${backgroundMarketing}
7) 📸 Personalization — bullets: up to 4 vehicle photos; optional custom text
8) 🧺 Materials & care — short bullets
9) 💬 Questions? — one short sentence inviting messages (multiple cars, people/pets, etc.)
10) 🏪 Explore the shop — one short sentence + soft CTA
Example rhythm:
\`\`\`
[1–2 sentence opening — no emoji]

____________________

👀 Mockup preview
• ...
• ...

____________________

👕 Front or back artwork
• ...
\`\`\`
If shop example descriptions show prices, omit those prices — follow structure/voice only.

Required background messaging for description (include this meaning; rephrase naturally if needed):
${backgroundMarketing}

Background pricing for optionsNotes field only (do not copy into description):
${bgLinesForOptionsNotes || "(none)"}

Fixed custom options:
${formatCustomFieldsNotes()}

${tshirtBlock}

Media alt texts (mediaAltTexts field): Generate exactly ${MEDIA_SLOTS.length} SEO-optimized alt texts, one for each media slot in this exact order.
For each item, set "slot" to the EXACT label string below (never use numbers like "1" or "2"):
${MEDIA_SLOTS.map((s, i) => `${i + 1}. "${s}"`).join("\n")}
Each alt text must: be ${MEDIA_ALT_TEXT_MIN}-${MEDIA_ALT_TEXT_MAX} characters, include the niche subject naturally, describe what the image shows, and incorporate relevant keywords. Do NOT start with "Image of" or "Photo of" - describe the content directly.

Marketplace comps for THIS niche keyword (titles/tags/engagement — use for title & tag strategy; ignore competitor process copy):
${marketplaceBlock}

YOUR shop examples (titles, tags, description excerpts) — gold standard for Motor Element voice and description structure:
${examples}`;
}

export async function generateWithOpenAI(
  input: GenerateInput,
  referenced: ShopListing[],
  trendingKeywords: string[] = [],
  marketplace: MarketplaceListing[] = []
): Promise<ListingOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  console.log("[openai] model:", model);
  console.log("[openai] comps in prompt:", referenced.length);
  console.log("[openai] marketplace comps:", marketplace.length);
  console.log("[openai] trending keywords:", trendingKeywords.length);
  console.log("[openai] requesting completion…");
  const client = new OpenAI({ apiKey, timeout: 90_000 });
  const t0 = Date.now();

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildUserPrompt(
          input,
          referenced,
          trendingKeywords,
          marketplace
        ),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: LISTING_JSON_SCHEMA,
    },
  });

  console.log(
    "[openai] response in",
    `${Date.now() - t0}ms`,
    "usage:",
    completion.usage || "n/a"
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    console.error("[openai] empty content from model");
    throw new Error("OpenAI returned empty content");
  }
  console.log("[openai] content length:", content.length);

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `OpenAI returned invalid JSON: ${err instanceof Error ? err.message : "parse error"}`
    );
  }

  const rawParsed = openaiListingSchema.safeParse(rawJson);
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
      input.price != null ? Number(input.price) : getDefaultBasePriceUsd();
    parsed.suggestedPrice = `$${base.toFixed(2)} USD`;
  }

  if (!parsed.optionsNotes) {
    parsed.optionsNotes =
      input.optionsNotes ||
      "See listing variations for backgrounds, sizes, and personalization.";
  }

  // Always force correct slot labels by position (model sometimes returns "1","2",…)
  const rawAlts = parsed.mediaAltTexts || [];
  const mediaAltTexts = MEDIA_SLOTS.map((slot, i) => ({
    slot,
    altText: truncateAlt(
      rawAlts[i]?.altText || `${input.subject} ${slot.toLowerCase()}`
    ),
  }));

  const description = stripPricesFromDescription(parsed.description).replace(
    /—/g,
    "-"
  );

  // Finalize title, then pack niche + evergreen tags.
  const title = ensureCustomTitlePrefix(
    parsed.title || "",
    140,
    input.productType
  );
  const tags = buildListingTags({
    subject: input.subject,
    title,
    trending: trendingKeywords,
    candidates: parsed.tags || [],
  });

  const output: ListingOutput = {
    title,
    tags,
    description,
    altText: truncateAlt(parsed.altText || title),
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

/** Remove dollar amounts from customer-facing description copy. */
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
