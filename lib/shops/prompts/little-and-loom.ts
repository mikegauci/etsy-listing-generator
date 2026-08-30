import type { ShopPromptContext } from "../types";
import { TAG_MAX_CHARS } from "../../tags";
import { resolveMediaContext } from "../../shop-listings";
import type { ShopListing } from "../../types";
import type { ChecklistSeoBrief } from "../../title-checklist";
import {
  LOOM_EVERGREEN_TAGS,
  LOOM_MEDIA_SLOTS,
} from "../slot-copy/little-and-loom";
import { getLoomSeoBriefForSubject } from "../little-and-loom/checklist";
import {
  LOOM_BLANKET_COLORS,
  LOOM_SECTION_HEADINGS,
  loomBlanketColorsBlock,
  loomCareInstructionsBlock,
  loomClosingCopy,
  loomDesignOptionsBlock,
  loomHowToPersonalizeBlock,
  loomPerfectForBlock,
  loomProductDetailsBlock,
  loomTextColorsBlock,
} from "../little-and-loom/product-facts";

const MEDIA_ALT_TEXT_MIN = 200;
const MEDIA_ALT_TEXT_MAX = 300;

function avgCompPrice(referenced: ShopListing[]): string | null {
  const priced = referenced.filter((r) => r.price_amount != null);
  if (!priced.length) return null;
  const avg =
    priced.reduce((s, r) => s + Number(r.price_amount), 0) / priced.length;
  const currency = priced[0].price_currency || "USD";
  return `${avg.toFixed(2)} ${currency}`;
}

function formatSeoBriefBlock(
  subject: string,
  brief: ChecklistSeoBrief | null
): string {
  if (!brief) {
    return `SEO brief for this subject: none matched a roadmap concept — treat "${subject}" as the listing concept. Prefer "Personalized Baby Blanket" / "Custom Name Blanket" / "Baby Shower Gift" only when they fit.`;
  }
  const niche = brief.niche.length ? brief.niche.join(", ") : "(none)";
  const support = brief.support.length ? brief.support.join(", ") : "(none)";
  const flags = [
    brief.giftPrimary ? "gift-primary (may lead with Baby Shower Gift)" : null,
  ]
    .filter(Boolean)
    .join("; ");
  return `SEO brief for this INTERNAL listing concept (use selectively — do not keyword-stuff):
- Lead phrase: ${brief.lead}
- Niche terms for THIS concept only: ${niche}
- Supporting phrases (pick what fits naturally): ${support}
${flags ? `- Intent flags: ${flags}` : ""}
Remember: the concept title is not the final Etsy title. Build a natural title that leads with the strongest relevant researched phrase. Keep each comma segment short (2–4 words).`;
}

export function buildLoomSystemPrompt(): string {
  return `You are an expert Etsy SEO copywriter for LittleAndLoomGifts, a shop selling personalized printed baby blankets.

## Voice and positioning
- Warm, gentle, nursery-focused and gift-ready. You are writing for parents, grandparents and baby shower buyers.
- The product is an ultra-soft velveteen microfiber baby blanket with a vibrant one-sided PRINTED design and optional printed personalized text.
- Blanket colors offered: ${LOOM_BLANKET_COLORS.join(", ")}. Available in three blanket sizes.
- The buyer chooses a blanket color, a design option, a text color and their personalized text at checkout.

## Brand isolation (critical — never break)
This shop is completely separate from any car, automotive or apparel brand. The description must NEVER contain:
- Cars, vehicles, engines, JDM, muscle cars, car enthusiasts, "car guy", garages or number plates
- Shirts, tees, hoodies, sweatshirts, apparel, front or back print sides, unisex sizing
- Vehicle photo uploads, background scenes, background upgrades or theme backgrounds
- The words "Motor Element", or Motor Element section names: "Mockup preview", "Front or back artwork", "Backgrounds", "Materials & care", "Explore the shop", "Why choose us", "Terms & conditions", "Follow us for more custom designs"
- Divider lines made of underscores (\`____________________\`)
- Social media links, shop policies, refund promises or follow-us calls to action
Write only about the baby blanket, its artwork, its personalization and its use as a baby gift.

## Description structure (follow exactly)
Use ALL CAPS emoji section headings, blank line between blocks, and \`• \` bullets. The section order is fixed:
1. Headline line: one emoji matching the artwork + space + ALL CAPS "PERSONALIZED <CONCEPT> BABY BLANKET" + space + the same emoji.
2. Opening prose: five short paragraphs, one or two sentences each, separated by blank lines. No emoji, no bullets, no headings.
3. ${LOOM_SECTION_HEADINGS.whyYoullLoveIt} — 8 to 10 short bullets.
4. ${LOOM_SECTION_HEADINGS.blanketColors}
5. ${LOOM_SECTION_HEADINGS.designOptions}
6. ${LOOM_SECTION_HEADINGS.textColors}
7. ${LOOM_SECTION_HEADINGS.howToPersonalize}
8. ${LOOM_SECTION_HEADINGS.perfectFor}
9. ${LOOM_SECTION_HEADINGS.productDetails}
10. A keepsake section: one emoji + ALL CAPS headline written for this concept, then three short paragraphs about why the blanket becomes a keepsake.
11. ${LOOM_SECTION_HEADINGS.careInstructions}
12. ${LOOM_SECTION_HEADINGS.pleaseNote}
13. ${LOOM_SECTION_HEADINGS.questions}
Sections 4, 5, 6, 7, 8, 9, 11, 12 and 13 are supplied to you as fixed copy. Reproduce them exactly, including their wording, bullets and numbering. Only sections 1, 2, 3 and 10 are written fresh for the concept.

## Description SEO
- The headline plus the first opening paragraph are what Etsy shows in search snippets. Lead with the strongest relevant search phrase, the product type and buyer intent.
- Align title, headline, opening paragraphs and tags on the SAME primary niche phrase.
- Weave niche tags and evergreen phrases into natural complete sentences across the opening and the "why you'll love it" bullets. NEVER dump a comma-separated keyword list.
- ALL CAPS is allowed ONLY on section headings. Never inside sentences or bullets.
- Emoji appear ONLY on section headings, exactly one leading emoji per heading.

## Title rules
- Usually start with "Personalized". Exception: gift-primary concepts may lead with "Baby Shower Gift".
- Aim for 13–16 natural words. Hard max 140 characters.
- Keep comma segments short (2–4 words). Clearly state blanket / baby gift intent.
- NEVER include blanket color names in the title or tags (colors belong in the description only).
- NEVER keyword-stuff recipients into one blob.
- Never include price or shipping language in the title.

## Tags
- Return ONLY 3 niche-specific tags (each ≤20 chars; optional 4th backup OK).
- Do NOT include the evergreen set below — the system appends all 10 automatically.
- Niche tags must be short complete 2–3 word phrases that fit in 20 characters.
- Fixed evergreen tags (appended automatically — do not output these): ${LOOM_EVERGREEN_TAGS.join(", ")}

## Other rules
- description field: NEVER include prices or dollar amounts.
- description field: NEVER use em dashes.
- Never describe the personalization as embroidered, stitched or sewn. It is printed.
- Alt text: each mediaAltTexts entry MUST be UNIQUE to its slot. Target ${MEDIA_ALT_TEXT_MIN}-${MEDIA_ALT_TEXT_MAX} characters. Never start with "Image of" or "Photo of".`;
}

export function buildLoomUserPrompt(ctx: ShopPromptContext): string {
  const { input, referenced, trendingKeywords, marketplace } = ctx;

  const marketplaceBlock =
    marketplace.length === 0
      ? "No marketplace comps available — rely on subject keywords and trending search terms."
      : marketplace
          .map((r, i) => {
            const tags =
              r.tags?.length > 0
                ? r.tags.join(", ")
                : "(tags not returned by API)";
            return `${i + 1}. id=${r.listing_id} views=${r.views} favs=${r.num_favorers}\nTitle: ${r.title}\nTags: ${tags}\nDesc excerpt: ${(r.description || "").slice(0, 500)}`;
          })
          .join("\n\n");

  const marketplaceTitles = marketplace
    .slice(0, 5)
    .map((r) => `- ${r.title}`)
    .join("\n");

  const trendingBlock =
    trendingKeywords.length > 0
      ? `Trending Etsy search terms:\n${trendingKeywords.join(", ")}`
      : "Trending Etsy search terms: none available for this run.";

  const seoBrief = getLoomSeoBriefForSubject(input.subject);
  const seoBriefBlock = formatSeoBriefBlock(input.subject, seoBrief);
  const media = resolveMediaContext(input);
  const avg = avgCompPrice(referenced);

  return `Write a LittleAndLoomGifts personalized baby blanket listing for this nursery concept. Use marketplace comps for title and tag strategy only — never for policies, structure or brand voice.

Subject / internal listing concept: ${input.subject}
${seoBriefBlock}
Product type: ${input.productType}
Blanket colors (description only — NEVER in title or tags): ${LOOM_BLANKET_COLORS.join(", ")}
Base price (USD): ${input.price ?? 39.99}
Extra seller notes: ${input.optionsNotes || "none"}
Reference media (context only): ${media}
Avg matched shop-comp price: ${avg || "n/a"}

${trendingBlock}

Marketplace title patterns (borrow phrasing that fits personalized baby blankets — do not copy brand names):
${marketplaceTitles || "(none)"}

Niche tags only: return 3 short niche-specific tags for "${input.subject}" (≤${TAG_MAX_CHARS} chars each). System appends: ${LOOM_EVERGREEN_TAGS.join(", ")}

=== DESCRIPTION: SECTIONS YOU WRITE ===

Section 1 — headline line
One emoji that matches the artwork, then ALL CAPS "PERSONALIZED <CONCEPT> BABY BLANKET", then the same emoji again.

Section 2 — opening prose, five short paragraphs, no emoji and no bullets:
a) A warm one-line invitation to wrap their little one in a blanket made especially for them.
b) What the artwork shows for "${input.subject}", paired with the baby's name as a keepsake.
c) That they choose blanket color, personalization style and text color to make it unique.
d) Ultra-soft velveteen microfiber, and the moments it suits: cuddle time, stroller rides, nursery moments, milestone photos, cozy days at home.
e) Gift framing: baby shower gift, newborn gift, or something special for their own little one.

Section 3 — ${LOOM_SECTION_HEADINGS.whyYoullLoveIt}
8 to 10 short bullets. Always include, adapted to this concept: personalized with the baby's name; the concept artwork described in a few words; five blanket colors; multiple personalization options; ultra-soft velveteen plush feel; lightweight, warm and comfortable; vibrant one-sided print; reinforced stitched edges; a thoughtful personalized baby gift; available in three blanket sizes.

Section 10 — keepsake section
One emoji plus an ALL CAPS headline written for this concept, then three short paragraphs: how a baby's name becomes something they can cuddle, photograph and keep; how the "${input.subject}" artwork creates a warm nursery feel; and the everyday moments the blanket becomes part of.

=== DESCRIPTION: FIXED COPY, REPRODUCE EXACTLY ===

${loomBlanketColorsBlock()}

${loomDesignOptionsBlock()}

${loomTextColorsBlock()}

${loomHowToPersonalizeBlock()}

${loomPerfectForBlock()}

${loomProductDetailsBlock()}

${loomCareInstructionsBlock()}

${loomClosingCopy()}

=== END DESCRIPTION ===

Media alt texts: Generate exactly ${LOOM_MEDIA_SLOTS.length} unique alt texts in this order:
${LOOM_MEDIA_SLOTS.map((s, i) => `${i + 1}. "${s}"`).join("\n")}
Each ${MEDIA_ALT_TEXT_MIN}-${MEDIA_ALT_TEXT_MAX} chars. Include subject "${input.subject}". Color-variant slots should describe that specific blanket color mockup.

Marketplace comps:
${marketplaceBlock}`;
}
