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

/** Artwork-grid backgrounds (24). No + Custom always selected; max 11 total. */
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

export const MAX_BACKGROUNDS = 11;

export const ALWAYS_SELECTED_BACKGROUND_IDS = BACKGROUND_OPTIONS.filter(
  (b) => b.alwaysSelected
).map((b) => b.id);

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
  const fromEnv = process.env[envKey] || process.env.ETSY_TAXONOMY_ID_TSHIRT;
  if (fromEnv && Number(fromEnv) > 0) return Number(fromEnv);
  return DEFAULT_TAXONOMY_IDS[productType] || DEFAULT_TAXONOMY_IDS["t-shirt"];
}

export function backgroundsByIds(ids: string[]): BackgroundOption[] {
  const map = new Map(BACKGROUND_OPTIONS.map((b) => [b.id, b]));
  return ids.map((id) => map.get(id)).filter(Boolean) as BackgroundOption[];
}

/** Preset theme backgrounds offered per listing (excludes no background + custom). */
export const LISTING_THEME_BACKGROUND_COUNT = 9;

export function themeBackgroundLabels(ids: string[]): string[] {
  return backgroundsByIds(ids)
    .filter((b) => b.id !== "no-background" && b.id !== "custom-background")
    .map((b) => b.label);
}

/** Customer-facing background blurb for listing descriptions (no prices). */
export function formatBackgroundMarketingCopy(backgroundIds: string[]): string {
  const themes = themeBackgroundLabels(backgroundIds);
  const examples =
    themes.length > 0
      ? ` Theme options on this listing include: ${themes.join(", ")}.`
      : "";
  return (
    `Choose from ${LISTING_THEME_BACKGROUND_COUNT} different backgrounds, keep it with no background, ` +
    `or we can create a customized background for you.${examples} Select your option at checkout.`
  );
}

export function defaultBackgroundIds(): string[] {
  return [...ALWAYS_SELECTED_BACKGROUND_IDS];
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

export function tshirtColorSizeValues(): string[] {
  const out: string[] = [];
  for (const color of TSHIRT_COLORS) {
    for (const size of TSHIRT_SIZES) {
      out.push(`${color} / ${size}`);
    }
  }
  return out;
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
