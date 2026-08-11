import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { compareListings } from "@/lib/compare";
import {
  fetchListingById,
  parseEtsyListingId,
} from "@/lib/etsy";
import { findRelevantListings } from "@/lib/keywords";
import { SHOP_LISTING_COLUMNS } from "@/lib/shop-listings";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import type { ShopListing } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1).max(500),
  myListingId: z.number().int().positive().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError(400, "Invalid request body", parsed.error.flatten());
    }

    const listingId = parseEtsyListingId(parsed.data.url);
    if (!listingId) {
      return apiError(
        400,
        "Could not parse an Etsy listing ID. Paste a listing URL or numeric ID."
      );
    }

    if (!hasSupabaseConfig()) {
      return apiError(503, "Supabase is not configured");
    }

    const theirs = await fetchListingById(listingId);
    const supabase = getSupabaseAdmin();

    let mine: ShopListing | null = null;
    let matchMode: "manual" | "auto" = "auto";

    if (parsed.data.myListingId) {
      matchMode = "manual";
      const { data, error } = await supabase
        .from("shop_listings")
        .select(SHOP_LISTING_COLUMNS)
        .eq("etsy_listing_id", parsed.data.myListingId)
        .maybeSingle();

      if (error) {
        return apiError(500, "Failed to load your listing", error);
      }
      if (!data) {
        return apiError(
          404,
          `Your listing ${parsed.data.myListingId} was not found in synced shop data. Sync from Shop data first.`
        );
      }
      mine = data as ShopListing;
    } else {
      const matches = await findRelevantListings(
        supabase,
        theirs.title,
        "t-shirt",
        1
      );
      mine = matches[0] || null;

      // Fallback: highest-view listing if scorer found nothing
      if (!mine) {
        const { data, error } = await supabase
          .from("shop_listings")
          .select(SHOP_LISTING_COLUMNS)
          .eq("state", "active")
          .order("views", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          return apiError(500, "Failed to load shop listings", error);
        }
        mine = (data as ShopListing) || null;
      }
    }

    if (!mine) {
      return apiError(
        404,
        "No synced shop listings to compare against. Connect Etsy and sync first."
      );
    }

    // Also return a short list of candidates for the override dropdown
    const { data: candidates, error: candErr } = await supabase
      .from("shop_listings")
      .select(SHOP_LISTING_COLUMNS)
      .eq("state", "active")
      .order("views", { ascending: false })
      .limit(50);

    if (candErr) {
      console.error("[compare] candidates", candErr);
    }

    const result = compareListings(mine, theirs);

    return NextResponse.json({
      theirs,
      mine,
      matchMode,
      compare: result,
      candidates: (candidates || []) as ShopListing[],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to compare listing";
    const status = /not found/i.test(message)
      ? 404
      : /ETSY_API_KEY|SHARED_SECRET/i.test(message)
        ? 503
        : 500;
    return apiError(status, message, err);
  }
}

/** Lightweight list of shop listings for the compare dropdown (no competitor fetch). */
export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ listings: [] });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shop_listings")
      .select(SHOP_LISTING_COLUMNS)
      .eq("state", "active")
      .order("views", { ascending: false })
      .limit(50);

    if (error) {
      return apiError(500, "Failed to load shop listings", error);
    }

    return NextResponse.json({ listings: (data || []) as ShopListing[] });
  } catch (err) {
    return apiError(500, "Failed to load shop listings", err);
  }
}
