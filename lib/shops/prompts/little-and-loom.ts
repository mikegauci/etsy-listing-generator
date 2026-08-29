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

function loomClosingCopy(): string {
  return [
    `⭐ Why choose us?`,
    `• Fully personalized with your chosen artwork and custom name`,
    `• Soft premium fleece blanket made for snuggles and nursery styling`,
    `• Fast turnaround with a preview before production when applicable`,
    `• A thoughtful gift for baby showers, newborns, and nursery decor`,
    ``,
    `____________________`,
    ``,
    `📜 Terms & conditions`,
    `• Personalization details must be provided at checkout`,
    `• We reach out if artwork or name details need clarification`,
    `• Satisfaction matters — contact us if anything needs adjusting`,
    ``,
    `____________________`,
    ``,
    `📲 Follow us for more custom designs`,
    `Stay updated with our latest nursery creations and special offers.`,
    `• Facebook: https://www.facebook.com/littleandloomgifts`,
    `• Instagram: https://www.instagram.com/littleandloomgifts`,
    ``,
    `🎁 Order now and create a keepsake blanket they'll treasure.`,
  ].join("\n");
}

export function buildLoomSystemPrompt(): string {
  return `You are an expert Etsy SEO copywriter for LittleAndLoomGifts, a shop selling personalized baby blankets with custom artwork and embroidered names.

## Voice and positioning
- Warm, nursery-focused, gift-ready tone for parents, grandparents, and baby shower buyers.
- Product is a soft fleece baby blanket with printed artwork and optional custom name embroidery.
- Five blanket colours are offered: Oatmeal Beige, Chocolate Brown, Baby Blue, Baby Pink, and Olive Green.
- Do NOT mention car apparel, vehicle photos, shirt backgrounds, or Motor Element process language.

## 2026 Etsy description SEO (must follow)
- First ~160 characters are highest priority. Lead with the strongest search phrase + product + gift intent in sentence 1. No emoji in the first ~160 chars.
- Align title, opening description, and tags on the SAME primary niche phrase.
- Write natural complete sentences; weave long-tail keywords and tag phrases into useful copy. NEVER dump a bare comma-separated keyword list at the bottom.
- Aim ~200–350 words. Prefer short paragraphs and bullets.
- Emojis: REQUIRED on every section header (exactly 1 leading emoji + space + title). Do NOT put emojis in the opening paragraph or body sentences.

## Description formatting (required)
- After the short opening paragraph, separate major sections with: \`____________________\`
- Section headings with emoji: \`👀 Mockup preview\`, \`🎨 Artwork & name\`, \`✨ Details\`, \`🎨 Colour options\`, \`📸 Personalization\`, \`🧺 Size & material\`, \`💬 Questions?\`, \`🏪 Explore the shop\`, \`⭐ Why choose us?\`, \`📜 Terms & conditions\`, \`📲 Follow us\`

## Title rules
- Usually start with "Personalized". Exception: gift-primary concepts may lead with "Baby Shower Gift".
- Aim for 13–16 natural words. Hard max 140 characters.
- Keep comma segments short (2–4 words). Clearly state blanket / baby gift intent.
- NEVER include blanket colour names in the title or tags (colours belong in description only).
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

  const colourBlock = `Blanket colour options (description only — NEVER in title or tags): Oatmeal Beige, Chocolate Brown, Baby Blue, Baby Pink, Olive Green. Buyer selects at checkout.`;

  return `Write a LittleAndLoomGifts listing for this nursery concept. Use marketplace comps for title/tag strategy only — not competitor policies.

Subject / internal listing concept: ${input.subject}
${seoBriefBlock}
Product type: ${input.productType}
${colourBlock}
Base price (USD): ${input.price ?? 39.99}
Extra seller notes: ${input.optionsNotes || "none"}
Reference media (context only): ${media}
Avg matched shop-comp price: ${avg || "n/a"}

${trendingBlock}

Marketplace title patterns (borrow phrasing that fits personalized baby blankets — do not copy brand names):
${marketplaceTitles || "(none)"}

Niche tags only: return 3 short niche-specific tags for "${input.subject}" (≤${TAG_MAX_CHARS} chars each). System appends: ${LOOM_EVERGREEN_TAGS.join(", ")}

Description structure (NO prices in description):
1) Keyword-first opening paragraph — no emoji
2) Divider, then emoji section headers
3) 👀 Mockup preview — preview before production when applicable; satisfaction focus
4) 🎨 Artwork & name — custom printed artwork + optional embroidered name
5) ✨ Details — product, softness, gift use
6) 🎨 Colour options — five fleece colours listed by name (no hex codes needed)
7) 📸 Personalization — how buyer provides name and artwork details
8) 🧺 Size & material — soft fleece, approximate size (30x40 inches unless noted), care bullets
9) 💬 Questions? — invite messages for custom requests
10) 🏪 Explore the shop — browse LittleAndLoomGifts for more nursery gifts
11) ⭐ Why choose us? — from closing copy below
12) 📜 Terms & conditions — from closing copy below
13) 📲 Follow us — from closing copy below

Required closing copy:
${loomClosingCopy()}

Media alt texts: Generate exactly ${LOOM_MEDIA_SLOTS.length} unique alt texts in this order:
${LOOM_MEDIA_SLOTS.map((s, i) => `${i + 1}. "${s}"`).join("\n")}
Each ${MEDIA_ALT_TEXT_MIN}-${MEDIA_ALT_TEXT_MAX} chars. Include subject "${input.subject}". Colour-variant slots should describe that specific blanket colour mockup.

Marketplace comps:
${marketplaceBlock}`;
}

export { loomClosingCopy };
