import type { GenerateInput, ListingOutput } from "../types";
import type { MarketplaceListing } from "../etsy";
import type { ShopListing } from "../types";
import type { ChecklistCategory, ChecklistSeoBrief } from "../title-checklist";

export type ShopId = "motor-element" | "little-and-loom";

export type BackgroundOption = {
  id: string;
  label: string;
  priceUsd: number;
  alwaysSelected?: boolean;
};

export type CustomFieldDef = {
  name: string;
  type: "file" | "text";
  optional: boolean;
  maxFiles?: number;
  extraUsd?: number;
};

export type MockupColor = {
  id: string;
  label: string;
  hex: string;
  textHex: string;
};

export type MockupBase = {
  id: string;
  label: string;
  url: string;
  sceneDescription: string;
};

export type MockupConfig = {
  colors: MockupColor[];
  bases: MockupBase[];
  buildPrompt: (opts: {
    base: MockupBase;
    color: MockupColor;
    personalizationName?: string;
  }) => string;
};

export type ShopPromptContext = {
  input: GenerateInput;
  referenced: ShopListing[];
  trendingKeywords: string[];
  marketplace: MarketplaceListing[];
};

export type ShopConfig = {
  id: ShopId;
  name: string;
  navLabel: string;
  hasSyncedCatalog: boolean;
  productTypes: readonly string[];
  defaults: {
    style: string;
    audience: string;
    colors: string;
    productType: string;
  };
  basePriceUsd: number;
  taxonomyIds: Record<string, number>;
  backgrounds: BackgroundOption[] | null;
  themeBackgroundCountOptions: readonly number[] | null;
  variants: {
    colors: readonly string[];
    sizes: readonly string[];
  } | null;
  customFields: CustomFieldDef[];
  mediaSlots: readonly string[];
  mediaAltTextMin: number;
  mediaAltTextMax: number;
  evergreenTags: readonly string[];
  nicheGenericWords: ReadonlySet<string>;
  descriptionSectionMarkers: readonly string[];
  titleWordMin: number;
  titleWordMax: number;
  titlePrefix: "Custom" | "Personalized";
  titleExtraPhrases: (productType?: string) => string[];
  giftPrimaryLead?: string;
  checklistCategories: ChecklistCategory[];
  seoScanProductIntent: RegExp;
  closingCopy: () => string;
  formatBackgroundMarketingCopy: (backgroundIds: string[]) => string;
  formatCustomFieldsNotes: () => string;
  getDefaultBackgroundIds: () => string[];
  maxBackgrounds: number;
  slotVisuals: Record<string, (subject: string, product: string) => string>;
  slotBonusPhrases: (
    slot: string,
    subject: string,
    product: string
  ) => string[];
  buildSystemPrompt: () => string;
  buildUserPrompt: (ctx: ShopPromptContext) => string;
  getSeoBriefForSubject: (subject: string) => ChecklistSeoBrief | null;
  generateMockListing: (
    input: GenerateInput,
    referenced: ShopListing[],
    trendingKeywords: string[],
    marketplace: MarketplaceListing[]
  ) => ListingOutput;
  mockups: MockupConfig | null;
};

export function normalizeShopId(value: string | null | undefined): ShopId {
  if (value === "little-and-loom") return "little-and-loom";
  return "motor-element";
}
