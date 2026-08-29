import { NextResponse } from "next/server";
import { generateInputSchema } from "@/lib/types";
import { formatTagsLine } from "@/lib/tags";
import { findRelevantListings } from "@/lib/keywords";
import { scanEtsyKeywords } from "@/lib/etsy-seo-scan";
import { fetchMarketplaceComps, type MarketplaceListing } from "@/lib/etsy";
import { getTaxonomyId } from "@/lib/product-options";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { apiError } from "@/lib/api";
import type { ShopListing } from "@/lib/types";
import { getShop } from "@/lib/shops";
import { generateWithOpenAI } from "@/lib/openai-generate";

export const maxDuration = 120;

function shouldUseMockGeneration(): boolean {
  return process.env.USE_MOCK_GENERATION === "true";
}

function taxonomyForShop(shopId: string, productType: string): number {
  const shop = getShop(shopId);
  const envKey = `ETSY_TAXONOMY_ID_${productType
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")}`;
  const fromEnv = process.env[envKey];
  if (fromEnv && Number(fromEnv) > 0) return Number(fromEnv);
  return shop.taxonomyIds[productType] ?? getTaxonomyId(productType);
}

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const body = await request.json();
    const parsed = generateInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const shop = getShop(input.shopId);

    let referenced: ShopListing[] = [];
    let trendingKeywords: string[] = [];
    let marketplace: MarketplaceListing[] = [];

    const compsPromise = (async () => {
      if (!shop.hasSyncedCatalog || !hasSupabaseConfig()) return [];
      try {
        const supabase = getSupabaseAdmin();
        return await findRelevantListings(
          supabase,
          input.subject,
          input.productType,
          12
        );
      } catch (err) {
        console.warn("[generate] shop comps failed", err);
        return [] as ShopListing[];
      }
    })();

    const seoPromise = (async () => {
      try {
        return await scanEtsyKeywords(
          input.subject,
          input.productType,
          shop.seoScanProductIntent
        );
      } catch (err) {
        console.warn("[generate] seo scan failed", err);
        return [] as string[];
      }
    })();

    const marketplacePromise = (async () => {
      try {
        const taxonomyId = taxonomyForShop(shop.id, input.productType);
        return await fetchMarketplaceComps(
          input.subject,
          input.productType,
          taxonomyId,
          8
        );
      } catch (err) {
        console.warn("[generate] marketplace comps failed", err);
        return [] as MarketplaceListing[];
      }
    })();

    [referenced, trendingKeywords, marketplace] = await Promise.all([
      compsPromise,
      seoPromise,
      marketplacePromise,
    ]);

    const isMock = shouldUseMockGeneration();
    const output = isMock
      ? shop.generateMockListing(
          input,
          referenced,
          trendingKeywords,
          marketplace
        )
      : await generateWithOpenAI(
          input,
          referenced,
          trendingKeywords,
          marketplace,
          shop.id
        );

    let savedId: string | null = null;
    if (hasSupabaseConfig()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("generated_listings")
          .insert({
            shop_id: shop.id,
            subject: input.subject,
            product_type: input.productType,
            style: input.style,
            audience: input.audience,
            colors: input.colors || null,
            price: input.price ?? null,
            options_notes: input.optionsNotes || output.optionsNotes || null,
            media_files: input.mediaFiles?.length ? input.mediaFiles : [],
            background_ids: input.backgroundIds?.length
              ? input.backgroundIds
              : [],
            title: output.title,
            tags: output.tags,
            description: output.description,
            alt_text: output.altText,
            seo_notes: output.seoNotes,
            referenced_listing_ids: referenced.map((r) =>
              String(r.etsy_listing_id)
            ),
            is_mock: isMock,
          })
          .select("id")
          .single();

        if (!error) {
          savedId = data?.id ?? null;
        }
      } catch (err) {
        console.warn("[generate] persist error", err);
      }
    }

    console.log("[generate] done in", `${Date.now() - started}ms`);

    return NextResponse.json({
      ...output,
      tagsLine: formatTagsLine(output.tags),
      id: savedId,
      isMock,
      shopId: shop.id,
    });
  } catch (err) {
    console.error("[generate] FAILED", err);
    return apiError(500, "Generation failed", err);
  }
}
