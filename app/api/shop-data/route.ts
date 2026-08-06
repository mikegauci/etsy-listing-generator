import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { computeKeywordStats } from "@/lib/keywords";
import { SHOP_LISTING_COLUMNS } from "@/lib/shop-listings";
import { apiError } from "@/lib/api";
import type { ShopListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        listings: [],
        keywords: { tags: [], titlePhrases: [] },
        etsyConnected: false,
        warning: "Supabase is not configured",
      });
    }

    const supabase = getSupabaseAdmin();

    const [{ data: listings, error }, { data: token }] = await Promise.all([
      supabase
        .from("shop_listings")
        .select(SHOP_LISTING_COLUMNS)
        .eq("state", "active")
        .order("views", { ascending: false })
        .limit(200),
      supabase
        .from("etsy_oauth_tokens")
        .select("id, updated_at")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (error) {
      return apiError(500, "Failed to load shop data", error);
    }

    const rows = (listings || []) as ShopListing[];
    const keywords = computeKeywordStats(rows);

    return NextResponse.json({
      listings: rows,
      keywords,
      etsyConnected: Boolean(token),
      tokenUpdatedAt: token?.updated_at ?? null,
    });
  } catch (err) {
    return apiError(500, "Failed to load shop data", err);
  }
}
