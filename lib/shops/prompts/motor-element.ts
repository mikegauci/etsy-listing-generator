import type { ShopPromptContext } from "../types";
import {
  TSHIRT_COLORS,
  TSHIRT_SIZES,
  backgroundsByIds,
  formatBackgroundMarketingCopy,
  formatCustomFieldsNotes,
  formatListingClosingCopy,
  getDefaultBasePriceUsd,
  MEDIA_SLOTS,
  MEDIA_ALT_TEXT_MAX,
  MEDIA_ALT_TEXT_MIN,
} from "../../product-options";
import { EVERGREEN_TAGS, TAG_MAX_CHARS } from "../../tags";
import { resolveMediaContext } from "../../shop-listings";
import { getSeoBriefForSubject, type ChecklistSeoBrief } from "../../title-checklist";
import type { ShopListing } from "../../types";

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
    return `SEO brief for this subject: none matched a roadmap concept — treat "${subject}" as the listing concept. Prefer "Custom Car Shirt" / "Custom Photo Shirt" / "Car Guy Gift" only when they fit; do not invent manufacturer SEO phrases.`;
  }
  const niche = brief.niche.length ? brief.niche.join(", ") : "(none)";
  const support = brief.support.length ? brief.support.join(", ") : "(none)";
  const flags = [
    brief.giftPrimary ? "gift-primary (may lead with Car Guy Gift)" : null,
    brief.photoPrimary ? "photo-primary (prefer Custom Photo Shirt phrasing)" : null,
  ]
    .filter(Boolean)
    .join("; ");
  return `SEO brief for this INTERNAL listing concept (use selectively — do not keyword-stuff):
- Lead phrase: ${brief.lead}
- Niche terms for THIS concept only: ${niche}
- Supporting phrases (pick what fits naturally): ${support}
${flags ? `- Intent flags: ${flags}` : ""}
Remember: the concept title is not the final Etsy title. Build a natural title that leads with the strongest relevant researched phrase. Keep each comma segment short (2–4 words) — never "… From Your Photo" long-tails.`;
}

export function buildMotorElementSystemPrompt(): string {
  return `You are an expert Etsy SEO copywriter for Motor Element. Match THIS SHOP'S EXISTING CATALOG for description structure and brand voice, while borrowing winning title/tag phrasing from high-engagement marketplace comps when they fit.

## Compare marketplace vs your shop (required)
- You receive YOUR shop examples AND live marketplace comps for the same niche keyword.
- Titles & tags: prefer patterns that appear often among high-engagement marketplace comps (views/favorites) when they still fit Motor Element (custom car photo shirts, gift framing). Do not copy another shop's brand name or unique slogans.
- Description: ALWAYS keep Motor Element process/voice from YOUR shop examples (mockup preview, front or back artwork, backgrounds, contact, shop CTA). Never copy competitor process, policies, or digital-download language.
- In seoNotes: briefly say which marketplace vs shop patterns drove the title and tags.

## 2026 Etsy description SEO (must follow)
- First ~160 characters are highest priority (Etsy snippet + Google meta). Lead with the strongest relevant search phrase + product type + buyer intent in sentence 1 (e.g. "Custom car shirt from your photo"). Keep the opening paragraph plain text (no emoji in the first ~160 chars).
- Align title, opening description, and tags on the SAME primary niche phrase.
- Write natural complete sentences; weave long-tail keywords AND the recommended listing tag phrases (your niche tags + the evergreen set) into useful copy. NEVER dump a bare comma-separated keyword list at the bottom.
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
- Section headings MUST start with one emoji, e.g. \`👀 Mockup preview\`, \`👕 Front or back artwork\`, \`✨ Details\`, \`🌆 Backgrounds\`, \`📸 Personalization\`, \`🧺 Materials & care\`, \`💬 Questions?\`, \`🏪 Explore the shop\`, \`⭐ Why choose us?\`, \`📜 Terms & conditions\`, \`📲 Follow us for more custom designs\`
- Keep Motor Element voice; formatting should feel clean and scannable, not dense or meme-y.

## Catalog voice (mirror YOUR shop examples)
- Opening: keyword-rich hook like your top Custom Car Shirt / Hoodie listings — niche subject named early, gift framing, what you do (vector / cartoon-style custom art from photos).
- Then: what makes it special — we send a mockup to preview before anything goes to printing; full refund if you do not like the artwork (state this clearly in the description).
- Then: artwork placement — REQUIRED: custom artwork is printed on the front OR back of the garment (buyer chooses one side). If they want both sides, they should contact the shop. Never say it is printed on both front and back by default.
- Then: Background options — REQUIRED copy: buyers can choose from the listed number of theme backgrounds, no background, or a customized background (no prices in description). Use the exact count from the background messaging below; you may name theme examples from the listing; do not list dollar amounts.
- Then: colors/sizes + materials/care + soft CTA. Keep Motor Element process language (mockup preview, approve/request changes, photo via order).
- Before the CTA: invite buyers to message/contact the shop for more info — e.g. multiple cars in one artwork, adding people or pets, or any other questions (required in every description).
- Then: shop visit CTA — REQUIRED: invite buyers to browse the Motor Element store for more custom car apparel and related products (word naturally, e.g. "Explore our shop for more designs" — not stiff or salesy).
- End with the REQUIRED closing blocks (Why choose us, Terms & conditions, Follow us) using the exact meaning and links from the closing copy below. Do not invent different policies.
- Title (follow Etsy's official tips + shop voice + researched keyword priorities):
  • The Subject field is an INTERNAL listing concept — not necessarily the final SEO title. Prioritize strong researched phrases when they fit the concept.
  • Researched high-value phrases (use only when relevant; do NOT stuff all into every title): "Custom Photo Shirt", "Custom Car Shirt", "Custom Photo T-Shirt", "Custom Picture Shirt", "JDM" / "JDM Shirt", "Car Guy Gift", "Racing Gift", "Racing Shirt", "Classic Car".
  • Usually start with "Custom". Exception: when gift intent is primary, you MAY lead with "Car Guy Gift" (e.g. "Car Guy Gift, Custom Car Shirt, Custom Photo Shirt, Personalized T-Shirt").
  • Lead with the strongest highly relevant search phrase for THIS concept, then supporting phrases. Prefer "Custom Car Shirt" for car-shirt listings; "Custom Photo Shirt" / "Custom Photo T-Shirt" when photo customization is primary; "Car Guy Gift" when gift is primary.
  • Niche terms (JDM, racing, classic car, truck, rally, muscle, etc.) only when they accurately match the concept — never force them.
  • Clearly state what you're selling (t-shirt, hoodie, mug, etc.) — not vague "art" alone.
  • Aim for 13–16 natural words (prefer ~15). Hard max 140 characters. Titles under 13 words are too short.
  • Keep EVERY comma segment short (about 2–4 words). Prefer compact researched phrases. Do NOT write long-tail segments like "Custom Car Shirt From Your Photo", "From Your Car Photo", or "Personalized Car Photo Shirt" — those waste the title. Photo personalization is covered by short phrases such as "Custom Photo Shirt".
  • NEVER invent manufacturer-specific SEO phrases (forbidden: "Custom BMW Shirt", "Custom Ford Mustang T-Shirt" for SEO). Do not use trademarked manufacturer names merely for SEO. Describe the product intent, not a make/model SEO dump.
  • NEVER keyword-stuff recipients or occasions into one blob (forbidden: "Birthday Gift for Him Dad Boyfriend Men", "Gift for Him Dad Boyfriend"). One clean gift phrase is enough — evergreen tags already cover dad/boyfriend.
  • If the niche is long, keep the lead phrase + product first and drop trailing gift phrases so you stay ≤16 words.
  • NEVER include garment colors in the title or tags (no Black, White, color names, or color lists). Colors belong only in the description variants section.
  • NEVER put description concepts in the title: no "front", "back", "front & back", "apparel", "illustration", "vehicle", or "owners". Front/back print belongs only in the description artwork section. "Car Guy Gift" as an exact phrase IS allowed when relevant; do not pad with bare "guy".
  • Keep it scannable with commas separating trait groups like existing shop titles.
  • Do NOT repeat the same word twice; move subjective hype ("perfect", "beautiful", "amazing") to the description.
  • Only mention holidays/recipients when essential to the item (e.g. "Father's Day gift" only if that's the hook).
  • Never include price, shipping, discounts, or sales language in the title.
  • Match comma rhythm of shop examples while obeying the rules above.
- Tags: return ONLY 3 niche-specific tags for this subject (each ≤20 chars; a 4th backup is OK). Do NOT include the evergreen set below — the system always appends all 10. Niche tags MUST be short complete 2–3 word phrases that fit entirely in 20 characters — never long-tail lines like "car shirt from your photo" (those truncate to broken tags like "car shirt from your"). Prefer compact niche phrases (e.g. "jdm shirt", "jdm car shirt", "racing gift"). Niche tags MUST echo important title keywords (concept niche + product/gift angles — not manufacturer names for SEO). Prefer trending Etsy search terms and marketplace tag patterns when they fit. Exact-phrase duplicates are not allowed; shared words across tags are OK. NEVER use color names in tags.
- Fixed evergreen tags (appended automatically — do not output these): ${EVERGREEN_TAGS.join(", ")}
- If niche-specific shop examples exist, blend those with marketplace phrasing. If none, use marketplace title/tag patterns + top Custom Car product-type shop listings as the structural template.
- Avoid restricted/trademarked claims; do not invent licensed OEM branding.
- description field: NEVER include prices, dollar amounts, or "+$X" fees — mention backgrounds and options by name only.
- description field: NEVER use em dashes. Use commas, periods, or regular hyphens (-) instead.
- suggestedPrice / optionsNotes: may include prices for internal/seller reference; optionsNotes is separate from description.
- Media filenames are context only
- Alt text (altText + mediaAltTexts): SEO for listing images. Each mediaAltTexts entry MUST be UNIQUE to its slot (different visual description + different SEO phrase mix). Describe what that specific image shows, include the niche subject, and weave a small rotating set of SEO phrases (niche tags, evergreen tags, AND extra long-tail phrases that may not be in the top-13 tags). Do not paste the same keyword list into every slot. Target ${MEDIA_ALT_TEXT_MIN}-${MEDIA_ALT_TEXT_MAX} characters each. Never start with "Image of" or "Photo of".
- Description SEO tags: the opening paragraph and gift/product sections MUST include your niche tags plus evergreen phrases as exact wording where natural (e.g. "custom car shirt", "personalized gift", "gift for him"). Still write readable sentences — not a tag dump.`;
}

export function buildMotorElementUserPrompt(ctx: ShopPromptContext): string {
  const { input, referenced, trendingKeywords, marketplace } = ctx;

  const examples =
    referenced.length === 0
      ? "No shop listings available. Use Motor Element custom car apparel title pattern: strong researched phrase + product + personalized/gift phrasing (no manufacturer SEO dumps)."
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

  const seoBrief = getSeoBriefForSubject(input.subject);
  const seoBriefBlock = formatSeoBriefBlock(input.subject, seoBrief);
  const leadRule = seoBrief?.giftPrimary
    ? 'gift-primary: you MAY lead with "Car Guy Gift"'
    : 'usually lead with "Custom" + strongest relevant phrase';

  return `Write a listing that belongs in this shop's catalog for this niche subject. Compare marketplace comps vs your shop examples to choose the strongest title and tags.

Subject / internal listing concept: ${input.subject}
${seoBriefBlock}
Product type: ${input.productType}
Color/variants text (description / options only — NEVER put colors in title or tags): ${input.colors || "Black, White"}
Base / No-background price (USD): ${basePrice}
Extra seller notes: ${input.optionsNotes || "none"}
Reference media (context only): ${media}
Avg matched shop-comp price: ${avg || "n/a"}

${trendingBlock}

Marketplace title patterns (borrow phrasing patterns that fit Motor Element — do not copy brand names or invent manufacturer SEO titles):
${marketplaceTitles || "(none)"}

Title templates from YOUR shop (adapt for concept "${input.subject}" — ${leadRule}; aim for 13–16 clean words, max 140 chars; NEVER stuff Birthday/Dad/Boyfriend/Men into one phrase; NEVER include colors, front/back print language, apparel, illustration, vehicle, or owners; NEVER create manufacturer-specific SEO phrases; follow Etsy title rules above):
${titleTemplates || `(none — e.g. Custom Car Shirt, JDM Shirt, Custom Photo T-Shirt, Car Guy Gift)`}

Niche tags only (tags field): return 3 short niche-specific tags for "${input.subject}" (complete 2–3 word phrases ≤${TAG_MAX_CHARS} chars each; optional 4th backup OK). Never long-tail phrases that won't fit (no "from your photo" in tags). The system appends these evergreen tags automatically — do not include them: ${EVERGREEN_TAGS.join(", ")}

Description structure (description field only — NO prices anywhere in description). Keep it easy to read: short opening, then bullets under each heading. No walls of text, no ALL CAPS. One emoji on each section header only.
1) One short keyword-first opening paragraph (concept niche + product + gift intent) — first 160 chars matter most; NO emoji. Weave niche tags + evergreen SEO phrases as exact wording naturally (custom car shirt, personalized gift, gift for him, etc.) — readable sentences, not a keyword dump.
2) Divider \`____________________\`, then section headings with one leading emoji each
3) 👀 Mockup preview — bullets: mockup before print; request changes; full refund if they dislike the artwork
4) 👕 Front or back artwork — bullets: front OR back (choose at checkout); contact shop for both sides. Do NOT say both sides are included by default
5) ✨ Details — bullets for product, style, colors, sizes
6) 🌆 Backgrounds — short bullets (no prices): ${backgroundMarketing}
7) 📸 Personalization — bullets: 1 vehicle photo; optional custom text
8) 🧺 Materials & care — short bullets
9) 💬 Questions? — one short sentence inviting messages (multiple cars, people/pets, etc.)
10) 🏪 Explore the shop — one short sentence + soft CTA
11) ⭐ Why choose us? — REQUIRED bullets from the closing copy below (customize lightly only for grammar/flow; keep claims)
12) 📜 Terms & conditions — REQUIRED bullets from the closing copy below (keep policy meaning exact)
13) 📲 Follow us for more custom designs — REQUIRED social links + gift CTA from the closing copy below
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

Required closing copy for description (include near the end after Explore the shop; keep meaning, policies, and URLs exact — light rephrase OK for flow only):
${formatListingClosingCopy()}

Background pricing for optionsNotes field only (do not copy into description):
${bgLinesForOptionsNotes || "(none)"}

Fixed custom options:
${formatCustomFieldsNotes()}

${tshirtBlock}

Media alt texts (mediaAltTexts field): Generate exactly ${MEDIA_SLOTS.length} SEO-optimized alt texts, one for each media slot in this exact order.
For each item, set "slot" to the EXACT label string below (never use numbers like "1" or "2"):
${MEDIA_SLOTS.map((s, i) => `${i + 1}. "${s}"`).join("\n")}
Each alt text must be UNIQUE (do not reuse the same sentences or the same keyword list across slots). Be ${MEDIA_ALT_TEXT_MIN}-${MEDIA_ALT_TEXT_MAX} characters; describe what THAT slot shows; include the niche subject "${input.subject}"; weave a few listing tags plus other long-tail SEO phrases that fit the slot (gift angle for gift slides, mockup/process language for process slides, etc.). Also set altText (primary listing image) uniquely. Do NOT start with "Image of" or "Photo of".

Marketplace comps for THIS niche keyword (titles/tags/engagement — use for title & tag strategy; ignore competitor process copy):
${marketplaceBlock}

YOUR shop examples (titles, tags, description excerpts) — gold standard for Motor Element voice and description structure:
${examples}`;
}
