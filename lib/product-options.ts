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

/** Artwork-grid backgrounds (24). No + Custom always selected; themes selectable. */
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: "no-background",
    label: "No background",
    priceUsd: 43,
    alwaysSelected: true,
  },
  { id: "retrowave", label: "Retrowave", priceUsd: 48 },
  { id: "mount-fuji", label: "Mount Fuji", priceUsd: 48 },
  { id: "mountain-pass", label: "Mountain Pass", priceUsd: 48 },
  { id: "eternal-path", label: "Eternal Path", priceUsd: 48 },
  { id: "miami", label: "Miami", priceUsd: 48 },
  { id: "racetrack", label: "Racetrack", priceUsd: 48 },
  { id: "las-vegas", label: "Las Vegas", priceUsd: 48 },
  { id: "cyberpunk", label: "Cyberpunk", priceUsd: 48 },
  { id: "daikoku", label: "Daikoku", priceUsd: 48 },
  { id: "daytona-beach", label: "Daytona Beach", priceUsd: 48 },
  { id: "dystopia", label: "Dystopia", priceUsd: 48 },
  { id: "forest", label: "Forest", priceUsd: 48 },
  { id: "godzilla", label: "Godzilla", priceUsd: 48 },
  { id: "london", label: "London", priceUsd: 48 },
  { id: "new-york", label: "New York", priceUsd: 48 },
  { id: "sakura", label: "Sakura", priceUsd: 48 },
  { id: "sand-dunes", label: "Sand Dunes", priceUsd: 48 },
  { id: "shibuya-crossing", label: "Shibuya Crossing", priceUsd: 48 },
  { id: "synthwave", label: "Synthwave", priceUsd: 48 },
  { id: "touge", label: "Touge", priceUsd: 48 },
  { id: "vaporwave", label: "Vaporwave", priceUsd: 48 },
  { id: "wangan", label: "Wangan", priceUsd: 48 },
  {
    id: "custom-background",
    label: "Custom background",
    priceUsd: 61,
    alwaysSelected: true,
  },
];

/** Theme background counts offered in the generate UI (excludes no + custom). */
export const THEME_BACKGROUND_COUNT_OPTIONS = [9, 16] as const;
export type ThemeBackgroundCount =
  (typeof THEME_BACKGROUND_COUNT_OPTIONS)[number];

export const ALWAYS_SELECTED_BACKGROUND_IDS = BACKGROUND_OPTIONS.filter(
  (b) => b.alwaysSelected
).map((b) => b.id);

export const THEME_BACKGROUND_OPTIONS = BACKGROUND_OPTIONS.filter(
  (b) => !b.alwaysSelected
);

/** Max total = max themes + always-selected (no + custom). */
export const MAX_BACKGROUNDS =
  Math.max(...THEME_BACKGROUND_COUNT_OPTIONS) +
  ALWAYS_SELECTED_BACKGROUND_IDS.length;

/** Default listing pack: first N themes in catalog order + always-selected. */
export function backgroundIdsForThemeCount(
  count: ThemeBackgroundCount
): string[] {
  const themes = THEME_BACKGROUND_OPTIONS.slice(0, count).map((b) => b.id);
  const always = ALWAYS_SELECTED_BACKGROUND_IDS;
  // Keep catalog order: no-background first, themes, custom last.
  const ordered: string[] = [];
  for (const opt of BACKGROUND_OPTIONS) {
    if (always.includes(opt.id) || themes.includes(opt.id)) {
      ordered.push(opt.id);
    }
  }
  return ordered;
}

export const TSHIRT_COLORS = ["Black", "White"] as const;
export const TSHIRT_SIZES = [
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
] as const;

export const CUSTOM_FIELDS: CustomFieldDef[] = [
  {
    name: "Upload car photo/s",
    type: "file",
    optional: true,
    maxFiles: 4,
  },
  {
    name: "Add text to your artwork",
    type: "text",
    optional: true,
    extraUsd: 3,
  },
];

/** Etsy taxonomy IDs (override via env when needed). */
export const DEFAULT_TAXONOMY_IDS: Record<string, number> = {
  "t-shirt": 1101, // Clothing > Men's Clothing > Tops & Tees (verify in shop)
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
};

export function getTaxonomyId(productType: string): number {
  const envKey = `ETSY_TAXONOMY_ID_${productType
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")}`;
  const fromEnv = process.env[envKey];
  if (fromEnv && Number(fromEnv) > 0) return Number(fromEnv);
  return DEFAULT_TAXONOMY_IDS[productType] || DEFAULT_TAXONOMY_IDS["t-shirt"];
}

/** Catalog base price for "No background" — single source of truth. */
export function getDefaultBasePriceUsd(): number {
  return (
    BACKGROUND_OPTIONS.find((b) => b.id === "no-background")?.priceUsd ?? 43
  );
}

export function backgroundsByIds(ids: string[]): BackgroundOption[] {
  const map = new Map(BACKGROUND_OPTIONS.map((b) => [b.id, b]));
  return ids.map((id) => map.get(id)).filter(Boolean) as BackgroundOption[];
}

/** Default theme count when none is chosen in the UI. */
export const LISTING_THEME_BACKGROUND_COUNT: ThemeBackgroundCount = 9;

export function themeBackgroundLabels(ids: string[]): string[] {
  return backgroundsByIds(ids)
    .filter((b) => b.id !== "no-background" && b.id !== "custom-background")
    .map((b) => b.label);
}

/** Customer-facing background blurb for listing descriptions (no prices). */
export function formatBackgroundMarketingCopy(backgroundIds: string[]): string {
  const themes = themeBackgroundLabels(backgroundIds);
  const count = themes.length || LISTING_THEME_BACKGROUND_COUNT;
  const examples =
    themes.length > 0
      ? ` Theme options on this listing include: ${themes.join(", ")}.`
      : "";
  return (
    `Choose from ${count} different backgrounds, keep it with no background, ` +
    `or we can create a customized background for you.${examples} Select your option at checkout.`
  );
}

export function formatCustomFieldsNotes(): string {
  return CUSTOM_FIELDS.map((f) => {
    if (f.type === "file") {
      return `${f.name}: optional file upload (up to ${f.maxFiles || 1} files)`;
    }
    const extra = f.extraUsd != null ? ` (+$${f.extraUsd.toFixed(2)})` : "";
    return `${f.name}: optional text box${extra}`;
  }).join("\n");
}

const SECTION_DIVIDER = "____________________";

/**
 * Fixed closing blocks for every listing description (Why Choose Us, terms, social).
 * Keep wording stable so OpenAI and mock paths stay aligned.
 */
export function formatListingClosingCopy(): string {
  return [
    `⭐ Why choose us?`,
    `• Customizable: Fully tailored to your preferences`,
    `• Fast turnaround: Receive your preview in just 12-48 hours - one of the fastest turnarounds out there`,
    `• High-quality artwork: Perfect for printing, sharing, or gifting`,
    `• Unique gift idea: A standout choice for car enthusiasts, truck lovers, or anyone who loves custom car drawings`,
    ``,
    SECTION_DIVIDER,
    ``,
    `📜 Terms & conditions`,
    `• We send up to 3 emails or messages for design approval. If we do not hear back after the 3rd email, we will proceed with the order`,
    `• Each order includes one vehicle. Additional vehicles incur extra charges`,
    `• Satisfaction guaranteed: Not happy with your design preview? We will refund your money - no questions asked`,
    ``,
    SECTION_DIVIDER,
    ``,
    `📲 Follow us for more custom designs`,
    `Stay updated with our latest creations and special offers.`,
    `• Facebook: https://www.facebook.com/motorelement`,
    `• Instagram: https://www.instagram.com/motorelement`,
    ``,
    `🎁 Order now and surprise the car enthusiast in your life with personalized car art.`,
  ].join("\n");
}

export const MEDIA_SLOTS = [
  "Featured Image",
  "Four Step Progress",
  "Backgrounds Grid",
  "How to Order",
  "No Background",
  "Custom Background",
  "Male Front Black Shirt",
  "Male Front White Shirt",
  "Female Front Black Shirt",
  "Female Front White Shirt",
  "Male Back Black Shirt",
  "Male Back White Shirt",
  "Female Back Black Shirt",
  "Female Back White Shirt",
  "The Perfect Gift",
  "Material Info",
  "T-Shirt Sizes",
] as const;

/** Target length for media alt texts (UI + model guidance). */
export const MEDIA_ALT_TEXT_MIN = 200;
export const MEDIA_ALT_TEXT_MAX = 300;
