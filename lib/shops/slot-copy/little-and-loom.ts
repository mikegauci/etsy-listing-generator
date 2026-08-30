import type { SlotVisualFn } from "../slot-copy/motor-element";
import type { TagNicheProfile } from "../../tags";

export const LOOM_TAG_NICHE: TagNicheProfile = {
  productWords: new Set([
    "blanket",
    "blankets",
    "swaddle",
    "swaddles",
    "throw",
    "keepsake",
    "nursery",
    "gift",
    "gifts",
  ]),
  buildSeeds: (first, shortBase) => [
    `${shortBase} blanket`,
    `${shortBase} gift`,
    `${first} baby gift`,
    `${first} blanket`,
    `${shortBase} nursery`,
  ],
  subjectPrefix: /^(personali[sz]ed|custom)\s+/i,
  productSuffix: /\s+(blankets?|swaddles?|throws?)$/i,
  baseSuffix: /\s+(blankets?|swaddles?|throws?|gifts?)$/i,
  colorPairWords: new Set(["blanket", "blankets", "swaddle", "throw"]),
  distinctiveStopWords: new Set(),
};

export const LOOM_MEDIA_SLOTS = [
  "Featured Image",
  "Oatmeal Beige Blanket",
  "Chocolate Brown Blanket",
  "Baby Blue Blanket",
  "Baby Pink Blanket",
  "Olive Green Blanket",
  "Name Personalization",
  "Artwork Close Up",
  "Colour Chart",
  "How to Order",
  "Size & Material",
  "The Perfect Baby Gift",
] as const;

export const LOOM_EVERGREEN_TAGS = [
  "personalized blanket",
  "baby blanket gift",
  "custom name blanket",
  "baby shower gift",
  "new baby gift",
  "newborn gift",
  "nursery decor",
  "baby girl gift",
  "baby boy gift",
  "personalized gift",
] as const;

export const LOOM_SLOT_VISUALS: Record<string, SlotVisualFn> = {
  "Featured Image": (s, p) =>
    `Hero product photo of a personalized ${s} ${p} with printed artwork and a custom name`,
  "Oatmeal Beige Blanket": (s, p) =>
    `Oatmeal beige velveteen ${p} featuring ${s} artwork in a nursery flat lay`,
  "Chocolate Brown Blanket": (s, p) =>
    `Chocolate brown velveteen ${p} featuring ${s} artwork in a cozy nursery setting`,
  "Baby Blue Blanket": (s, p) =>
    `Baby blue velveteen ${p} featuring ${s} artwork styled for a boy nursery gift`,
  "Baby Pink Blanket": (s, p) =>
    `Baby pink velveteen ${p} featuring ${s} artwork styled for a girl nursery gift`,
  "Olive Green Blanket": (s, p) =>
    `Olive green velveteen ${p} featuring ${s} artwork in a neutral nursery scene`,
  "Name Personalization": (s, p) =>
    `Close detail of the printed custom name on a ${s} ${p}`,
  "Artwork Close Up": (s, p) =>
    `Close-up of printed ${s} artwork on soft velveteen ${p} texture`,
  "Colour Chart": (s, p) =>
    `Colour options chart for a ${s} personalized ${p} gift listing`,
  "How to Order": (s, p) =>
    `How to order steps for a custom ${s} ${p} with name and artwork`,
  "Size & Material": (s, p) =>
    `Size and material details for a premium ${s} ${p}`,
  "The Perfect Baby Gift": (s, p) =>
    `Gift-focused layout presenting a ${s} ${p} as a baby shower or newborn present`,
};

export function loomSlotBonus(
  slot: string,
  subject: string,
  product: string
): string[] {
  const niche =
    subject
      .replace(/^personalized\s+/i, "")
      .replace(/\s+(blanket|swaddle)$/i, "")
      .trim() || subject;
  const short = niche.split(/\s+/).slice(0, 2).join(" ") || niche;
  const productWord = product.replace(/-/g, " ").trim() || "blanket";

  const bySlot: Record<string, string[]> = {
    "Featured Image": [
      `${short} blanket`,
      `custom ${short}`,
      `personalized ${productWord}`,
    ],
    "Oatmeal Beige Blanket": [
      `beige baby blanket`,
      `${short} nursery`,
      `neutral baby gift`,
    ],
    "Chocolate Brown Blanket": [
      `brown baby blanket`,
      `${short} gift`,
      `cozy nursery decor`,
    ],
    "Baby Blue Blanket": [
      `blue baby blanket`,
      `boy nursery gift`,
      `${short} blue`,
    ],
    "Baby Pink Blanket": [
      `pink baby blanket`,
      `girl nursery gift`,
      `${short} pink`,
    ],
    "Olive Green Blanket": [
      `green baby blanket`,
      `neutral nursery`,
      `${short} green`,
    ],
    "Name Personalization": [
      `custom name blanket`,
      `printed baby name`,
      `${short} name gift`,
    ],
    "Artwork Close Up": [
      `${short} print detail`,
      `velveteen print quality`,
      `custom artwork blanket`,
    ],
    "Colour Chart": [
      `blanket color options`,
      `${short} colors`,
      `nursery color chart`,
    ],
    "How to Order": [
      `order custom blanket`,
      `${short} personalization`,
      `custom baby order`,
    ],
    "Size & Material": [
      `baby blanket size`,
      `soft velveteen blanket`,
      `premium baby gift`,
    ],
    "The Perfect Baby Gift": [
      `baby shower gift`,
      `newborn present`,
      `personalized baby gift`,
    ],
  };

  return bySlot[slot] || [`${short} ${productWord}`, `${short} gift`];
}
