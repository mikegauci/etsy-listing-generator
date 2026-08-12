import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { fetchActiveListingFeaturedImages } from "@/lib/etsy";
import { SHOP_LISTING_COLUMNS } from "@/lib/shop-listings";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import type { ShopListing } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type DuplicateListingOption = {
  id: string;
  etsyListingId: number;
  title: string;
  featuredImageUrl: string | null;
};

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        listings: [] as DuplicateListingOption[],
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
        .select("id")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (error) {
      return apiError(500, "Failed to load shop listings", error);
    }

    const etsyConnected = Boolean(token);
    const rows = (listings || []) as ShopListing[];

    let featuredById = new Map<number, string>();
    if (etsyConnected && rows.length) {
      try {
        featuredById = await fetchActiveListingFeaturedImages();
      } catch (err) {
        console.error("[api/duplicate/listings] featured images", err);
      }
    }

    const options: DuplicateListingOption[] = rows.map((row) => ({
      id: row.id,
      etsyListingId: row.etsy_listing_id,
      title: row.title,
      featuredImageUrl: featuredById.get(row.etsy_listing_id) || null,
    }));

    return NextResponse.json({
      listings: options,
      etsyConnected,
    });
  } catch (err) {
    return apiError(500, "Failed to load duplicate listings", err);
  }
}
