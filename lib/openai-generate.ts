import OpenAI from "openai";
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
  MEDIA_ALT_TEXT_MIN,
} from "./product-options";
import { ensureCustomTitlePrefix } from "./listing-title";

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
        minItems: 13,
        maxItems: 13,
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
- Titles & tags: prefer patterns that appear often among high-engagement marketplace comps (views/favorites) when they still fit Motor Element (custom car illustration apparel, gift framing). Do not copy another shop's brand name or unique slogans.
- Description: ALWAYS keep Motor Element process/voice from YOUR shop examples (mockup preview, front/back artwork, backgrounds, contact, shop CTA). Never copy competitor process, policies, or digital-download language.
- In seoNotes: briefly say which marketplace vs shop patterns drove the title and tags.

## 2026 Etsy description SEO (must follow)
- First ~160 characters are highest priority (Etsy snippet + Google meta). Lead with the niche primary keyword + product type + buyer intent in sentence 1 (e.g. "Custom Ford Mustang t-shirt" / "Ford car guy gift"), NOT a vague hype line. Keep the opening paragraph plain text (no emoji in the first ~160 chars).
- Align title, opening description, and tags on the SAME primary niche phrase.
- Write natural complete sentences; weave long-tail keywords into useful info. NEVER dump comma-separated keyword lists at the bottom.
- Aim ~250–400 words. Short paragraphs + bullets for variants (mobile-first).
- Do not start with "Welcome to my shop" or empty greetings.

## Description formatting (required)
- After the opening paragraph, separate major sections with a divider line using underscores or slashes, e.g. \`____________________\` or \`/ / / / / / / / / /\` (pick one style and stay consistent).
- Start section headings with a relevant emoji + short label, e.g. \`✨ Mockup preview\`, \`🎨 Front & back artwork\`, \`🖼️ Backgrounds\`, \`👕 Details\`, \`✏️ Personalization\`, \`🧼 Materials & care\`, \`💬 Questions?\`, \`🏪 Explore the shop\`.
- Use a light sprinkle of emojis in section headers and 1–2 bullets where it helps scanability — do not emoji-spam every sentence.
- Keep Motor Element voice; formatting should feel like a polished Etsy listing, not a meme dump.

## Catalog voice (mirror YOUR shop examples)
- Opening: keyword-rich hook like your top Custom Car Shirt / Hoodie listings — niche subject named early, gift framing, what you do (vector / cartoon-style custom art from photos).
- Then: what makes it special — we send a mockup to preview before anything goes to printing; full refund if you do not like the artwork (state this clearly in the description).
- Then: artwork placement — REQUIRED: custom artwork is printed on the front and back of the garment (state clearly; rephrase naturally).
- Then: Background options — REQUIRED copy: buyers can choose from 9 different backgrounds, no background, or a customized background (no prices in description). You may name theme examples from the listing; do not list dollar amounts.
- Then: colors/sizes + materials/care + soft CTA. Keep Motor Element process language (mockup preview, approve/request changes, photo via order).
- Before the CTA: invite buyers to message/contact the shop for more info — e.g. multiple cars in one artwork, adding people or pets, or any other questions (required in every description).
- End with a shop visit CTA — REQUIRED: invite buyers to browse the Motor Element store for more custom car apparel and related products (word naturally, e.g. "Explore our shop for more designs" — not stiff or salesy).
- Title (follow Etsy’s official tips + shop voice + marketplace winners):
  • ALWAYS start with the word "Custom" as the first word (e.g. "Custom Ford Mustang T-Shirt, Black White, Car Guy Gift"). Never lead with the niche, product type, or any other word.
  • Clearly state what you’re selling (t-shirt, hoodie, mug, etc.) — not vague “art” alone.
  • Put the most important traits upfront in the first ~40 chars after Custom: niche subject + product type + 1–2 concrete traits (e.g. color options like Black/White when relevant).
  • Keep it scannable: aim for under 15 words total; use commas to separate trait groups like existing shop titles.
  • Do NOT repeat the same word twice; move subjective hype (“perfect”, “beautiful”, “amazing”) to the description.
  • Only mention holidays/recipients when essential to the item (e.g. “Father’s Day gift” only if that’s the hook).
  • Never include price, shipping, discounts, or sales language in the title.
  • Max 140 characters; match comma rhythm of shop examples while obeying the rules above.
- Tags: exactly 13, ≤20 chars, no duplicate words across tags; reuse successful tag patterns from niche/product comps and marketplace comps. Prefer trending Etsy search terms when they fit naturally.
- If niche-specific shop examples exist (e.g. Ford), blend those with marketplace phrasing. If none, use marketplace title/tag patterns + top Custom Car product-type shop listings as the structural template.
- Avoid restricted/trademarked claims; do not invent licensed OEM branding.
- description field: NEVER include prices, dollar amounts, or "+$X" fees — mention backgrounds and options by name only.
- description field: NEVER use em dashes (—). Use commas, periods, or regular hyphens (-) instead.
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

  const media =
    input.mediaFiles?.length
      ? input.mediaFiles.map((m) => `${m.kind}: ${m.name}`).join("; ")
      : input.imageName
        ? `image: ${input.imageName}`
        : "none";

  const avg = avgCompPrice(referenced);
  const bgs = backgroundsByIds(input.backgroundIds || []);
  const backgroundMarketing = formatBackgroundMarketingCopy(input.backgroundIds || []);
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

  return `Write a listing that belongs in this shop's catalog for this niche subject. Compare marketplace comps vs your shop examples to choose the strongest title and tags.

Subject / niche keywords (MUST appear in title + first ~160 chars of description): ${input.subject}
Product type: ${input.productType}
Color/variants text: ${input.colors || "Black, White"}
Base / No-background price (USD): ${input.price != null ? input.price : 43}
Extra seller notes: ${input.optionsNotes || "none"}
Reference media (context only): ${media}
Avg matched shop-comp price: ${avg || "n/a"}

${trendingBlock}

Marketplace title patterns (borrow phrasing patterns that fit Motor Element — do not copy brand names):
${marketplaceTitles || "(none)"}

Title templates from YOUR shop (adapt for "${input.subject}" — first word MUST be Custom; follow Etsy title rules above, not keyword stuffing):
${titleTemplates || "(none — e.g. Custom Ford Mustang T-Shirt, Black White, Car Guy Gift)"}

Description structure (description field only — NO prices anywhere in description):
1) Keyword-first opening (subject + product + gift intent) — first 160 chars matter most; NO emoji in this opening block
2) Divider line (underscores OR slashes), then emoji section headers for the rest
3) ✨ Mockup preview before printing + full refund if they do not like the artwork (required)
4) 🎨 Front and back artwork (required — state that custom artwork is on the front and back of the garment)
5) 🖼️ Background options (required — weave in naturally, no prices): ${backgroundMarketing}
   ✏️ Personalization: upload up to 4 vehicle photos; optional custom text (no fees stated)
6) 👕 Colors/sizes + 🧼 materials/care
7) 💬 Contact us / message the shop for more info — multiple cars in one artwork, people or pets in the design, or any other questions (required)
8) 🏪 Invite buyers to visit/browse the Motor Element shop for more custom car products (required — natural wording)
9) Soft CTA (Add to cart, etc.)
Example section rhythm:
\`\`\`
[opening paragraph — no emoji]

____________________

✨ Mockup preview
...

____________________

🎨 Front & back artwork
...
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
  const client = new OpenAI({ apiKey });
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

  const parsed = JSON.parse(content) as ListingOutput;

  parsed.tags = (parsed.tags || [])
    .map((t) => t.slice(0, 20).trim())
    .filter(Boolean)
    .slice(0, 13);

  while (parsed.tags.length < 13) {
    parsed.tags.push(`car gift tag ${parsed.tags.length + 1}`.slice(0, 20));
  }

  if (!parsed.referencedListings?.length && referenced.length) {
    parsed.referencedListings = referenced.map((r) => {
      const price =
        r.price_amount != null
          ? ` (${r.price_amount} ${r.price_currency || "USD"})`
          : "";
      return `${r.etsy_listing_id}: ${r.title}${price}`;
    });
  }

  if (!parsed.suggestedPrice) {
    const base = input.price != null ? Number(input.price) : 43;
    parsed.suggestedPrice = `$${base.toFixed(2)} USD`;
  }

  if (!parsed.optionsNotes) {
    parsed.optionsNotes =
      input.optionsNotes ||
      "See listing variations for backgrounds, sizes, and personalization.";
  }

  // Always force correct slot labels by position (model sometimes returns "1","2",…)
  const rawAlts = parsed.mediaAltTexts || [];
  parsed.mediaAltTexts = MEDIA_SLOTS.map((slot, i) => ({
    slot,
    altText: (rawAlts[i]?.altText || `${input.subject} ${slot.toLowerCase()}`).slice(
      0,
      MEDIA_ALT_TEXT_MAX
    ),
  }));

  parsed.description = stripPricesFromDescription(parsed.description)
    .replace(/—/g, "-");

  parsed.title = ensureCustomTitlePrefix(parsed.title || "");

  return parsed;
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
