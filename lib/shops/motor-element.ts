import type { ShopConfig } from "./types";
import {
  BACKGROUND_OPTIONS,
  CUSTOM_FIELDS,
  DESCRIPTION_SEO_COPY,
  TSHIRT_COLORS,
  TSHIRT_SIZES,
  MEDIA_SLOTS,
  MEDIA_ALT_TEXT_MIN,
  MEDIA_ALT_TEXT_MAX,
  THEME_BACKGROUND_COUNT_OPTIONS,
  LISTING_THEME_BACKGROUND_COUNT,
  backgroundIdsForThemeCount,
  MAX_BACKGROUNDS,
  formatBackgroundMarketingCopy,
  formatCustomFieldsNotes,
  formatListingClosingCopy,
  getDefaultBasePriceUsd,
} from "../product-options";
import { EVERGREEN_TAGS, MOTOR_ELEMENT_TAG_NICHE } from "../tags";
import {
  ALL_CHECKLIST_CATEGORIES,
  getSeoBriefForSubject,
} from "../title-checklist";
import { generateMockListing } from "../mock-generate";
import {
  buildMotorElementSystemPrompt,
  buildMotorElementUserPrompt,
} from "./prompts/motor-element";
import { MOTOR_ELEMENT_SLOT_BONUS, MOTOR_ELEMENT_SLOT_VISUALS } from "./slot-copy/motor-element";

const NICHE_GENERIC_WORDS = new Set([
  "custom",
  "personalized",
  "personalised",
  "graphic",
  "gift",
  "gifts",
  "shirt",
  "shirts",
  "tee",
  "tees",
  "tshirt",
  "tshirts",
  "t-shirt",
  "t-shirts",
  "hoodie",
  "hoodies",
  "sweatshirt",
  "sweatshirts",
  "photo",
  "photos",
  "print",
  "prints",
  "apparel",
  "for",
  "him",
  "her",
  "dad",
  "boyfriend",
  "men",
  "women",
  "guy",
  "guys",
]);

export const motorElementShop: ShopConfig = {
  id: "motor-element",
  name: "Motor Element",
  navLabel: "Motor Element",
  hasSyncedCatalog: true,
  productTypes: [
    "t-shirt",
    "hoodie",
    "sweatshirt",
    "tank top",
    "poster",
    "canvas print",
    "digital download",
    "mug",
    "phone case",
    "sticker",
    "tote bag",
  ],
  defaults: {
    style: "Custom car illustration",
    audience: "Car guy gift",
    colors: "Black, White",
    productType: "t-shirt",
  },
  basePriceUsd: getDefaultBasePriceUsd(),
  taxonomyIds: {
    "t-shirt": 1101,
    hoodie: 1103,
    sweatshirt: 1103,
    "tank top": 1101,
    poster: 1247,
    "canvas print": 1247,
    "digital download": 1665,
    mug: 1229,
    "phone case": 3327,
    sticker: 1252,
    "tote bag": 1210,
  },
  backgrounds: BACKGROUND_OPTIONS,
  themeBackgroundCountOptions: THEME_BACKGROUND_COUNT_OPTIONS,
  variants: {
    colors: TSHIRT_COLORS,
    sizes: TSHIRT_SIZES,
  },
  customFields: CUSTOM_FIELDS,
  mediaSlots: MEDIA_SLOTS,
  mediaAltTextMin: MEDIA_ALT_TEXT_MIN,
  mediaAltTextMax: MEDIA_ALT_TEXT_MAX,
  evergreenTags: EVERGREEN_TAGS,
  nicheGenericWords: NICHE_GENERIC_WORDS,
  tagNiche: MOTOR_ELEMENT_TAG_NICHE,
  descriptionSeoCopy: DESCRIPTION_SEO_COPY,
  descriptionSectionMarkers: [
    "Mockup preview",
    "Front or back artwork",
    "Details",
    "Backgrounds",
    "Personalization",
    "Materials & care",
    "Questions",
    "Explore the shop",
    "Why choose us",
    "Terms & conditions",
    "Follow us",
  ],
  titleWordMin: 13,
  titleWordMax: 16,
  titlePrefix: "Custom",
  titleExtraPhrases: (productType) => {
    const p = (productType || "t-shirt").trim().toLowerCase();
    let label = "Shirt";
    if (p === "hoodie") label = "Hoodie";
    else if (p === "sweatshirt") label = "Sweatshirt";
    else if (p === "tank top") label = "Tank Top";
    else if (p === "poster") label = "Poster";
    else if (p === "mug") label = "Mug";
    return [`Custom Photo ${label}`, "Car Guy Gift", "Gift for Him"];
  },
  giftPrimaryLead: "Car Guy Gift",
  checklistCategories: ALL_CHECKLIST_CATEGORIES,
  seoScanProductIntent:
    /(shirt|tee|t-shirt|hoodie|gift|custom|car|apparel|art|print|merch)/i,
  closingCopy: formatListingClosingCopy,
  formatBackgroundMarketingCopy,
  formatCustomFieldsNotes,
  getDefaultBackgroundIds: () =>
    backgroundIdsForThemeCount(LISTING_THEME_BACKGROUND_COUNT),
  maxBackgrounds: MAX_BACKGROUNDS,
  slotVisuals: MOTOR_ELEMENT_SLOT_VISUALS,
  slotBonusPhrases: MOTOR_ELEMENT_SLOT_BONUS,
  buildSystemPrompt: buildMotorElementSystemPrompt,
  buildUserPrompt: buildMotorElementUserPrompt,
  getSeoBriefForSubject,
  generateMockListing,
  mockups: null,
};
