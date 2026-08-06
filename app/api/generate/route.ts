import { NextResponse } from "next/server";
import { generateInputSchema } from "@/lib/types";
import { formatTagsLine } from "@/lib/tags";
import { generateMockListing } from "@/lib/mock-generate";
import { generateWithOpenAI } from "@/lib/openai-generate";
import { findRelevantListings } from "@/lib/keywords";
import { scanEtsyKeywords } from "@/lib/etsy-seo-scan";
import { fetchMarketplaceComps, type MarketplaceListing } from "@/lib/etsy";
import { getTaxonomyId } from "@/lib/product-options";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { apiError } from "@/lib/api";
import type { ShopListing } from "@/lib/types";

export const maxDuration = 120;

function shouldUseMockGeneration(): boolean {
  return process.env.USE_MOCK_GENERATION === "true";
}

export async function POST(request: Request) {
  const started = Date.now();
  console.log("\n[generate] ── request received ──");

  try {
    const body = await request.json();
    const parsed = generateInputSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[generate] invalid input", parsed.error.flatten());
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    console.log("[generate] subject:", input.subject);
    console.log("[generate] productType:", input.productType);
    console.log(
      "[generate] backgrounds:",
      (input.backgroundIds || []).length
    );
    console.log(
      "[generate] mode:",
      shouldUseMockGeneration() ? "MOCK" : "OPENAI"
    );

    let referenced: ShopListing[] = [];
    let trendingKeywords: string[] = [];
    let marketplace: MarketplaceListing[] = [];

    const compsPromise = (async () => {
      if (!hasSupabaseConfig()) {
        console.log("[generate] Supabase not configured — skipping comps");
        return [] as ShopListing[];
      }

      console.log("[generate] loading shop comps…");
      try {
        const supabase = getSupabaseAdmin();
        const listings = await findRelevantListings(
          supabase,
          input.subject,
          input.productType,
          12
        );
        console.log(
          "[generate] comps:",
          listings.length,
          listings.slice(0, 5).map((r) => ({
            id: r.etsy_listing_id,
            views: r.views,
            title: (r.title || "").slice(0, 60),
          }))
        );
        return listings;
      } catch (err) {
        console.warn("[generate] shop comps failed", err);
        return [] as ShopListing[];
      }
    })();

    const seoPromise = (async () => {
      console.log("[generate] scanning Etsy SEO trends…");
      try {
        const keywords = await scanEtsyKeywords(
          input.subject,
          input.productType
        );
        console.log(
          "[generate] seo trends:",
          keywords.length,
          keywords.slice(0, 8)
        );
        return keywords;
      } catch (err) {
        console.warn("[generate] seo scan failed", err);
        return [] as string[];
      }
    })();

    const marketplacePromise = (async () => {
      console.log("[generate] loading marketplace comps…");
      try {
        const taxonomyId = getTaxonomyId(input.productType);
        const listings = await fetchMarketplaceComps(
          input.subject,
          input.productType,
          taxonomyId,
          8
        );
        console.log(
          "[generate] marketplace comps:",
          listings.length,
          listings.slice(0, 5).map((r) => ({
            id: r.listing_id,
            views: r.views,
            favs: r.num_favorers,
            title: (r.title || "").slice(0, 60),
          }))
        );
        return listings;
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
    console.log(
      isMock
        ? "[generate] building mock listing…"
        : "[generate] calling OpenAI…"
    );
    const genStarted = Date.now();
    const output = isMock
      ? generateMockListing(input, referenced, trendingKeywords, marketplace)
      : await generateWithOpenAI(
          input,
          referenced,
          trendingKeywords,
          marketplace
        );
    console.log(
      "[generate] copy ready in",
      `${Date.now() - genStarted}ms`,
      "— title:",
      output.title.slice(0, 80)
    );

    let savedId: string | null = null;
    if (hasSupabaseConfig()) {
      console.log("[generate] saving to generated_listings…");
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from("generated_listings")
          .insert({
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

        if (error) {
          console.warn("[generate] persist failed", error);
        } else {
          savedId = data?.id ?? null;
          console.log("[generate] saved id:", savedId);
        }
      } catch (err) {
        console.warn("[generate] persist error", err);
      }
    }

    console.log(
      "[generate] ── done in",
      `${Date.now() - started}ms`,
      "──\n"
    );

    return NextResponse.json({
      ...output,
      tagsLine: formatTagsLine(output.tags),
      id: savedId,
      isMock,
    });
  } catch (err) {
    console.error("[generate] FAILED after", `${Date.now() - started}ms`, err);
    return apiError(500, "Generation failed", err);
  }
}
