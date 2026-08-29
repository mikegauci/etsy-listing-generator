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
  loomClosingCopy,
} from "../prompts/little-and-loom";
import {
  LOOM_EVERGREEN_TAGS,
  LOOM_MEDIA_SLOTS,
  LOOM_SLOT_VISUALS,
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
    colors:
      "Oatmeal Beige, Chocolate Brown, Baby Blue, Baby Pink, Olive Green",
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
      name: "Baby name for embroidery",
      type: "text",
      optional: false,
    },
    {
      name: "Upload artwork PNG",
      type: "file",
      optional: true,
      maxFiles: 1,
    },
  ],
  mediaSlots: LOOM_MEDIA_SLOTS,
  mediaAltTextMin: 200,
  mediaAltTextMax: 300,
  evergreenTags: LOOM_EVERGREEN_TAGS,
  nicheGenericWords: LOOM_NICHE_GENERIC_WORDS,
  descriptionSectionMarkers: [
    "Mockup preview",
    "Artwork & name",
    "Details",
    "Colour options",
    "Personalization",
    "Size & material",
    "Questions",
    "Explore the shop",
    "Why choose us",
    "Terms & conditions",
    "Follow us",
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
    "Choose from five soft fleece colours: Oatmeal Beige, Chocolate Brown, Baby Blue, Baby Pink, and Olive Green. Select your colour at checkout.",
  formatCustomFieldsNotes: () =>
    [
      "Baby name for embroidery: required text at checkout",
      "Upload artwork PNG: optional file upload (1 image)",
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
