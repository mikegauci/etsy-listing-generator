const GARMENT_COLOR_WORDS = new Set([
  "black",
  "white",
  "navy",
  "blue",
  "red",
  "green",
  "grey",
  "gray",
  "charcoal",
  "heather",
  "pink",
  "purple",
  "yellow",
  "orange",
  "brown",
  "beige",
  "cream",
  "maroon",
  "burgundy",
  "teal",
  "olive",
  "khaki",
  "ivory",
  "silver",
  "gold",
]);

/** Description-only concepts that should not pad the title. */
const TITLE_FILLER_WORDS = new Set([
  "apparel",
  "illustration",
  "vehicle",
  "vehicles",
  "owner",
  "owners",
  "guy",
  "guys",
]);

const TITLE_STOP_WORDS = new Set([
  "for",
  "and",
  "the",
  "a",
  "an",
  "of",
  "to",
  "with",
  "&",
  "/",
  "-",
]);

/** True if every word in the phrase is a garment color name. */
export function isColorOnlyPhrase(phrase: string): boolean {
  const words = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => GARMENT_COLOR_WORDS.has(w));
}

/** True if the phrase contains any garment color word. */
export function containsGarmentColor(phrase: string): boolean {
  return phrase
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((w) => GARMENT_COLOR_WORDS.has(w));
}

/**
 * Drop comma-separated title segments that are only garment colors
 * (e.g. "Black White", "Black, White") while keeping niche words like "Black Camaro".
 */
export function stripGarmentColorsFromTitle(title: string): string {
  const parts = title
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((part) => !isColorOnlyPhrase(part));

  return parts.join(", ").replace(/\s+/g, " ").trim();
}

function isTitleFillerWord(word: string): boolean {
  const lower = word.toLowerCase();
  if (TITLE_FILLER_WORDS.has(lower)) return true;
  // Exact "front"/"back" only — keeps model names like "Frontier".
  return lower === "front" || lower === "back";
}

/**
 * Remove description-only filler from titles (front/back print language,
 * apparel/illustration/vehicle/owners/guy padding). Keeps product + gift phrasing.
 */
export function stripTitleFiller(title: string): string {
  let t = title.replace(/\s+/g, " ").trim();

  // Front/back print belongs in the description, never the title.
  t = t.replace(/\bfront\s*(?:&|and|\/)\s*back\b/gi, " ");
  t = t.replace(/\bfront\s+back\b/gi, " ");

  const parts = t
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const words = part.split(/\s+/).filter(Boolean);
      const hadFiller = words.some((w) => isTitleFillerWord(w));
      const cleanedWords = words.filter((w) => !isTitleFillerWord(w));
      // Drop segments that were mostly description fluff.
      if (hadFiller) {
        const content = cleanedWords.filter(
          (w) => !TITLE_STOP_WORDS.has(w.toLowerCase())
        );
        if (content.length < 2) return "";
      }
      return cleanedWords.join(" ").trim();
    })
    .filter(Boolean);

  return parts.join(", ").replace(/\s+/g, " ").trim();
}

/** Trim to Etsy's preferred title word count (keeps the front-loaded keywords). */
export function trimTitleWords(title: string, maxWords = 14): string {
  const words = title.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  // Prefer cutting at a comma boundary when possible.
  const cut = words.slice(0, maxWords).join(" ").replace(/,\s*$/, "").trim();
  const lastComma = cut.lastIndexOf(",");
  if (lastComma > cut.length * 0.4) {
    return cut.slice(0, lastComma).trim();
  }
  return cut;
}

function titleWordKey(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function productTitleLabel(productType?: string): string {
  const p = (productType || "t-shirt").trim().toLowerCase();
  if (p === "t-shirt" || p === "tee") return "Shirt";
  if (p === "hoodie") return "Hoodie";
  if (p === "sweatshirt") return "Sweatshirt";
  if (p === "tank top") return "Tank Top";
  if (p === "poster") return "Poster";
  if (p === "canvas print") return "Canvas Print";
  if (p === "digital download") return "Digital Download";
  if (p === "mug") return "Mug";
  if (p === "phone case") return "Phone Case";
  if (p === "sticker") return "Sticker";
  if (p === "tote bag") return "Tote Bag";
  return p
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Natural trait phrases only — never word-by-word recipient dumps. */
function titleExtraPhrases(productType?: string): string[] {
  const label = productTitleLabel(productType);
  return [`Personalized Car Photo ${label}`, "Gift for Him"];
}

/**
 * Expand short titles toward ~10–14 words with clean, natural trait groups.
 * Preserves existing comma segments from the model; only pads when short.
 * Avoids keyword stuffing like "Birthday Gift for Him Dad Boyfriend Men".
 */
export function fillTitleWordBudget(
  title: string,
  targetWords = 14,
  productType?: string
): string {
  const cleaned = title.replace(/\s+/g, " ").trim().replace(/,\s*$/, "");
  if (!cleaned) return cleaned;

  const used = new Set(
    cleaned
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => titleWordKey(w))
      .filter(Boolean)
  );

  let result = cleaned;
  let total = cleaned.split(/\s+/).filter(Boolean).length;

  for (const phrase of titleExtraPhrases(productType)) {
    if (total >= targetWords) break;
    const words = phrase.split(/\s+/);
    // Skip phrase if most content words are already present.
    const fresh = words.filter((w) => {
      const key = titleWordKey(w);
      return key && !used.has(key) && !["for"].includes(key);
    });
    if (fresh.length < 2) continue;

    const room = targetWords - total;
    if (room < 2) break;

    // Only append the full phrase when it fits; otherwise skip (don't truncate mid-phrase).
    if (words.length > room) continue;

    result = `${result}, ${phrase}`;
    for (const w of words) {
      const key = titleWordKey(w);
      if (key) used.add(key);
    }
    total += words.length;
  }

  return result.replace(/\s+/g, " ").trim().replace(/,\s*$/, "");
}

function trimTitleChars(title: string, max: number): string {
  if (title.length <= max) return title;
  const cut = title.slice(0, max).trimEnd();
  const lastComma = cut.lastIndexOf(",");
  const lastSpace = cut.lastIndexOf(" ");
  const boundary = Math.max(lastComma, lastSpace);
  if (boundary > max * 0.5) {
    return cut.slice(0, boundary).trim().replace(/,\s*$/, "");
  }
  return cut.replace(/,\s*$/, "");
}

/** Ensure listing titles start with "Custom" (Motor Element catalog convention). */
export function ensureCustomTitlePrefix(
  title: string,
  max = 140,
  productType?: string
): string {
  let t = stripTitleFiller(stripGarmentColorsFromTitle(title));
  if (!t) return "Custom";

  if (/^custom\b/i.test(t)) {
    t = t.replace(/^custom\b/i, "Custom");
  } else {
    t = `Custom ${t}`;
  }

  // Drop stuffed recipient dumps if the model produced them.
  t = t
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((seg) => !isRecipientKeywordDump(seg))
    .join(", ");

  t = t
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .trim()
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  t = fillTitleWordBudget(t, 14, productType);
  t = trimTitleWords(t, 14);

  return trimTitleChars(t, max);
}

/** e.g. "Birthday Gift for Him Dad Boyfriend Men" — too many recipients jammed. */
export function isRecipientKeywordDump(segment: string): boolean {
  const words = segment.toLowerCase().split(/\s+/).filter(Boolean);
  const recipients = words.filter((w) =>
    ["him", "dad", "boyfriend", "men", "man", "father", "fathers", "birthday"].includes(
      w
    )
  );
  // One clean "Gift for Him" is fine; 3+ recipient/occasion words = stuffing.
  return recipients.length >= 3;
}
