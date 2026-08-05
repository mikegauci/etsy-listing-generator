import { etsyFetch } from "./etsy";
import {
  backgroundsByIds,
  formatCustomFieldsNotes,
  getTaxonomyId,
  tshirtColorSizeValues,
  type BackgroundOption,
} from "./product-options";

const PROP_BACKGROUND = 513;
const PROP_COLOR_SIZE = 514;

export type CreateDraftInput = {
  title: string;
  description: string;
  tags: string[];
  productType: string;
  backgroundIds: string[];
  /** Override No-background base price */
  basePrice?: number;
};

export type CreateDraftResult = {
  listingId: number;
  url: string | null;
};

function personalizationInstructions(): string {
  return [
    "Please upload clear photos of your car (optional, up to 4 files).",
    "Add any text you want on the artwork (optional, +$3.00).",
    "",
    formatCustomFieldsNotes(),
  ].join("\n");
}

function resolveBackgroundPrices(
  ids: string[],
  basePrice?: number
): BackgroundOption[] {
  return backgroundsByIds(ids).map((b) => {
    if (b.id === "no-background" && basePrice != null && basePrice > 0) {
      return { ...b, priceUsd: basePrice };
    }
    return b;
  });
}

function buildInventoryProducts(
  backgrounds: BackgroundOption[],
  productType: string
) {
  const isTee = productType === "t-shirt";
  const colorSizes = isTee ? tshirtColorSizeValues() : ["Default"];

  const products = [];
  for (const bg of backgrounds) {
    for (const colorSize of colorSizes) {
      const property_values = [
        {
          property_id: PROP_BACKGROUND,
          property_name: "Background",
          values: [bg.label],
        },
      ];
      if (isTee) {
        property_values.push({
          property_id: PROP_COLOR_SIZE,
          property_name: "Color / Size",
          values: [colorSize],
        });
      }
      products.push({
        sku: `${bg.id}-${colorSize}`.replace(/[^a-zA-Z0-9/_-]/g, "-").slice(0, 100),
        property_values,
        offerings: [
          {
            price: bg.priceUsd,
            quantity: 999,
            is_enabled: true,
          },
        ],
      });
    }
  }

  const price_on_property = [PROP_BACKGROUND];
  const quantity_on_property = isTee
    ? [PROP_BACKGROUND, PROP_COLOR_SIZE]
    : [PROP_BACKGROUND];
  const sku_on_property = quantity_on_property;

  return { products, price_on_property, quantity_on_property, sku_on_property };
}

export async function createDraftListing(
  input: CreateDraftInput
): Promise<CreateDraftResult> {
  const shopId = process.env.ETSY_SHOP_ID;
  if (!shopId) throw new Error("ETSY_SHOP_ID is not set");

  const backgrounds = resolveBackgroundPrices(
    input.backgroundIds,
    input.basePrice
  );
  if (backgrounds.length < 2 || backgrounds.length > 11) {
    throw new Error("Select between 2 and 11 backgrounds (No + Custom required)");
  }

  const noBg = backgrounds.find((b) => b.id === "no-background");
  const basePrice = noBg?.priceUsd ?? input.basePrice ?? 43;
  const taxonomyId = getTaxonomyId(input.productType);

  const tags = (input.tags || [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 13);

  const description = [
    input.description,
    "",
    "—",
    "Personalization:",
    personalizationInstructions(),
  ].join("\n");

  // createDraftListing expects application/x-www-form-urlencoded per Etsy docs
  const body = new URLSearchParams();
  body.set("quantity", "999");
  body.set("title", input.title.slice(0, 140));
  body.set("description", description.slice(0, 100000));
  body.set("price", String(basePrice));
  body.set("who_made", "i_did");
  body.set("when_made", "made_to_order");
  body.set("taxonomy_id", String(taxonomyId));
  body.set("type", "physical");
  body.set("is_personalizable", "true");
  body.set("personalization_is_required", "false");
  body.set("personalization_char_count_max", "256");
  body.set(
    "personalization_instructions",
    personalizationInstructions().slice(0, 1024)
  );
  body.set("should_auto_renew", "true");
  for (const tag of tags) {
    body.append("tags[]", tag.slice(0, 20));
  }

  const createRes = await etsyFetch(
    `/application/shops/${shopId}/listings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`createDraftListing failed: ${createRes.status} ${text}`);
  }

  const created = (await createRes.json()) as {
    listing_id: number;
    url?: string;
  };
  const listingId = created.listing_id;
  if (!listingId) {
    throw new Error("Etsy draft created but listing_id missing");
  }

  const inventory = buildInventoryProducts(backgrounds, input.productType);
  const invRes = await etsyFetch(
    `/application/listings/${listingId}/inventory`,
    {
      method: "PUT",
      body: JSON.stringify(inventory),
    }
  );

  if (!invRes.ok) {
    const text = await invRes.text();
    throw new Error(
      `Draft ${listingId} created but inventory update failed: ${invRes.status} ${text}`
    );
  }

  return {
    listingId,
    url:
      created.url ||
      `https://www.etsy.com/listing/${listingId}`,
  };
}
