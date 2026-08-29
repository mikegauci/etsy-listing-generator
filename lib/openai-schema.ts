import type { ShopConfig } from "./shops/types";

export function buildListingJsonSchema(shop: ShopConfig) {
  const slotCount = shop.mediaSlots.length;
  return {
    name: "etsy_listing",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        tags: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 4,
        },
        description: { type: "string" },
        altText: { type: "string" },
        mediaAltTexts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              slot: { type: "string" },
              altText: { type: "string" },
            },
            required: ["slot", "altText"],
          },
          minItems: slotCount,
          maxItems: slotCount,
        },
        seoNotes: { type: "string" },
        referencedListings: {
          type: "array",
          items: { type: "string" },
        },
        suggestedPrice: { type: "string" },
        optionsNotes: { type: "string" },
      },
      required: [
        "title",
        "tags",
        "description",
        "altText",
        "mediaAltTexts",
        "seoNotes",
        "referencedListings",
        "suggestedPrice",
        "optionsNotes",
      ],
    },
  } as const;
}

export function buildOpenAiListingSchema(shop: ShopConfig) {
  const slotCount = shop.mediaSlots.length;
  return {
    title: true,
    tags: true,
    description: true,
    altText: true,
    mediaAltTexts: { min: 1, max: slotCount },
    seoNotes: true,
    referencedListings: true,
    suggestedPrice: true,
    optionsNotes: true,
  };
}
