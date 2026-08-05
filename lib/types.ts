import { z } from "zod";
import {
  ALWAYS_SELECTED_BACKGROUND_IDS,
  BACKGROUND_OPTIONS,
  MAX_BACKGROUNDS,
} from "./product-options";

export const PRODUCT_TYPES = [
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
] as const;

export const STYLE_OPTIONS = [
  "Custom car illustration",
  "Flat vector",
  "Cartoon / stylized",
  "Line art",
  "Retro / vintage",
  "Minimalist silhouette",
  "Photo-based custom",
  "Other",
] as const;

export const AUDIENCE_OPTIONS = [
  "Car guy gift",
  "Birthday gift",
  "Gift for him / boyfriend / father",
  "JDM fan",
  "F1 fan",
  "Garage / wall decor",
  "Custom for my car",
  "Other",
] as const;

export const mediaFileSchema = z.object({
  name: z.string().min(1).max(300),
  kind: z.enum(["image", "video"]),
});

export type MediaFileMeta = z.infer<typeof mediaFileSchema>;

const validBackgroundIds = new Set(BACKGROUND_OPTIONS.map((b) => b.id));

export const generateInputSchema = z
  .object({
    subject: z.string().min(1).max(200),
    productType: z.string().min(1).max(100),
    /** Catalog defaults — not collected in UI */
    style: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .default("Custom car illustration"),
    audience: z.string().min(1).max(200).optional().default("Car guy gift"),
    colors: z.string().max(200).optional().default(""),
    price: z.number().positive().max(10000).optional().nullable(),
    optionsNotes: z.string().max(1000).optional().default(""),
    mediaFiles: z.array(mediaFileSchema).max(20).optional().default([]),
    backgroundIds: z
      .array(z.string())
      .min(2)
      .max(MAX_BACKGROUNDS)
      .optional()
      .default([...ALWAYS_SELECTED_BACKGROUND_IDS]),
    /** @deprecated use mediaFiles */
    imageName: z.string().max(300).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const ids = data.backgroundIds || [];
    for (const id of ALWAYS_SELECTED_BACKGROUND_IDS) {
      if (!ids.includes(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Background "${id}" must always be selected`,
          path: ["backgroundIds"],
        });
      }
    }
    for (const id of ids) {
      if (!validBackgroundIds.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown background id: ${id}`,
          path: ["backgroundIds"],
        });
      }
    }
    if (ids.length > MAX_BACKGROUNDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Select at most ${MAX_BACKGROUNDS} backgrounds`,
        path: ["backgroundIds"],
      });
    }
  });

export type GenerateInput = z.infer<typeof generateInputSchema>;

export const mediaAltTextSchema = z.object({
  slot: z.string(),
  altText: z.string(),
});

export type MediaAltText = z.infer<typeof mediaAltTextSchema>;

export const listingOutputSchema = z.object({
  title: z.string(),
  tags: z.array(z.string()).length(13),
  description: z.string(),
  altText: z.string(),
  mediaAltTexts: z.array(mediaAltTextSchema),
  seoNotes: z.string(),
  referencedListings: z.array(z.string()),
  suggestedPrice: z.string(),
  optionsNotes: z.string(),
});

export type ListingOutput = z.infer<typeof listingOutputSchema>;

export type ShopListing = {
  id: string;
  etsy_listing_id: number;
  title: string;
  tags: string[];
  description: string;
  views: number;
  num_favorers: number;
  taxonomy_path: string | null;
  category: string | null;
  price_amount: number | null;
  price_currency: string | null;
  state: string;
  url: string | null;
  synced_at: string;
};

export type GeneratedListingRow = {
  id: string;
  subject: string;
  product_type: string;
  style: string | null;
  audience: string | null;
  colors: string | null;
  price: number | null;
  options_notes: string | null;
  media_files: MediaFileMeta[] | null;
  background_ids: string[] | null;
  title: string;
  tags: string[];
  description: string;
  alt_text: string;
  seo_notes: string;
  referenced_listing_ids: string[];
  is_mock: boolean;
  created_at: string;
  suggested_price?: string | null;
};

export type KeywordStat = {
  term: string;
  count: number;
  totalViews: number;
  totalFavorers: number;
  score: number;
};
