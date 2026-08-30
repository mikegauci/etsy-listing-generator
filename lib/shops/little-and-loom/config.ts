import type { ShopConfig } from "../types";
import {
  BLANKET_COLORS,
  BLANKET_MOCKUP_BASE_SOURCE_URL,
  BLANKET_SCENE_DESCRIPTION,
  buildBlanketMockupPrompt,
} from "../mockup-prompt";
import {
  LOOM_CHECKLIST_CATEGORIES,
  getLoomSeoBriefForSubject,
} from "./checklist";
import { generateLoomMockListing } from "./mock-generate";
import {
  buildLoomSystemPrompt,
  buildLoomUserPrompt,
} from "../prompts/little-and-loom";
import {
  LOOM_BLANKET_COLORS,
  LOOM_DESIGN_OPTIONS,
  LOOM_NO_TEXT_OPTION,
  LOOM_TEXT_COLORS,
  loomClosingCopy,
} from "./product-facts";
import {
  LOOM_EVERGREEN_TAGS,
  LOOM_MEDIA_SLOTS,
  LOOM_SLOT_VISUALS,
  LOOM_TAG_NICHE,
  loomSlotBonus,
} from "../slot-copy/little-and-loom";

const LOOM_NICHE_GENERIC_WORDS = new Set([
  "personalized",
  "personalised",
  "custom",
  "gift",
  "gifts",
  "blanket",
  "blankets",
  "baby",
  "newborn",
  "nursery",
  "for",
  "name",
  "print",
  "prints",
  "decor",
  "shower",
]);

const loomConfigBase: Omit<
  ShopConfig,
  "generateMockListing" | "buildSystemPrompt" | "buildUserPrompt"
> = {
  id: "little-and-loom",
  name: "LittleAndLoomGifts",
  navLabel: "Little & Loom",
  hasSyncedCatalog: false,
  productTypes: [
    "personalized baby blanket",
    "baby blanket",
    "swaddle blanket",
    "nursery blanket",
    "milestone blanket",
  ],
  defaults: {
    style: "Custom nursery artwork",
    audience: "Baby shower gift",
    colors: LOOM_BLANKET_COLORS.join(", "),
    productType: "personalized baby blanket",
  },
  basePriceUsd: 39.99,
  taxonomyIds: {
    "personalized baby blanket": 931,
    "baby blanket": 931,
    "swaddle blanket": 931,
    "nursery blanket": 931,
    "milestone blanket": 931,
  },
  backgrounds: null,
  themeBackgroundCountOptions: null,
  variants: null,
  customFields: [
    {
      name: "Personalization text",
      type: "text",
      optional: true,
    },
  ],
  mediaSlots: LOOM_MEDIA_SLOTS,
  mediaAltTextMin: 200,
  mediaAltTextMax: 300,
  evergreenTags: LOOM_EVERGREEN_TAGS,
  nicheGenericWords: LOOM_NICHE_GENERIC_WORDS,
  tagNiche: LOOM_TAG_NICHE,
  descriptionSeoCopy: {
    productNoun: "personalized baby blanket",
    audienceNoun: "new parents",
  },
  descriptionSectionMarkers: [
    "WHY YOU'LL LOVE IT",
    "BLANKET COLORS",
    "DESIGN OPTIONS",
    "TEXT COLORS",
    "HOW TO PERSONALIZE",
    "PERFECT FOR",
    "PRODUCT DETAILS",
    "CARE INSTRUCTIONS",
    "PLEASE NOTE",
    "QUESTIONS OR SPECIAL REQUESTS",
  ],
  titleWordMin: 13,
  titleWordMax: 16,
  titlePrefix: "Personalized",
  titleExtraPhrases: () => [
    "Baby Shower Gift",
    "New Baby Gift",
    "Custom Name Blanket",
  ],
  giftPrimaryLead: "Baby Shower Gift",
  checklistCategories: LOOM_CHECKLIST_CATEGORIES,
  seoScanProductIntent:
    /(blanket|baby|newborn|nursery|shower|gift|personalized|custom|name|swaddle|fleece)/i,
  closingCopy: loomClosingCopy,
  formatBackgroundMarketingCopy: () =>
    `Choose from five velveteen microfiber blanket colors: ${LOOM_BLANKET_COLORS.join(", ")}. Select your color, design option and text color at checkout.`,
  formatCustomFieldsNotes: () =>
    [
      `Blanket color: ${LOOM_BLANKET_COLORS.join(", ")}`,
      `Design option: ${LOOM_DESIGN_OPTIONS.map((o) => o.label).join(", ")}`,
      `Text color: ${LOOM_TEXT_COLORS.join(", ")}, ${LOOM_NO_TEXT_OPTION}`,
      "Personalization text: printed exactly as entered at checkout",
    ].join("\n"),
  getDefaultBackgroundIds: () => [],
  maxBackgrounds: 0,
  slotVisuals: LOOM_SLOT_VISUALS,
  slotBonusPhrases: loomSlotBonus,
  getSeoBriefForSubject: getLoomSeoBriefForSubject,
  mockups: {
    colors: BLANKET_COLORS,
    bases: [
      {
        id: "blanket-mockup-1",
        label: "Folded blanket flat lay",
        url: BLANKET_MOCKUP_BASE_SOURCE_URL,
        sceneDescription: BLANKET_SCENE_DESCRIPTION,
      },
    ],
    buildPrompt: buildBlanketMockupPrompt,
  },
};

export const littleAndLoomShop: ShopConfig = {
  ...loomConfigBase,
  buildSystemPrompt: buildLoomSystemPrompt,
  buildUserPrompt: buildLoomUserPrompt,
  generateMockListing(input, referenced, trending, marketplace) {
    return generateLoomMockListing(
      littleAndLoomShop,
      input,
      referenced,
      trending,
      marketplace
    );
  },
};
