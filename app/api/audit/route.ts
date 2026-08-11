import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { SHOP_LISTING_COLUMNS } from "@/lib/shop-listings";
import { auditShop } from "@/lib/audit";
import { apiError } from "@/lib/api";
import type { ShopListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        perListing: [],
        cannibalization: {
          differentiation: [],
          tagCoverage: [],
          pairwise: [],
          titlePhraseOverlap: [],
        },
        summary: {
          listingCount: 0,
          averageScore: 0,
          highFindingCount: 0,
        },
        warning: "Supabase is not configured",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("shop_listings")
      .select(SHOP_LISTING_COLUMNS)
      .eq("state", "active")
      .order("views", { ascending: false })
      .limit(200);

    if (error) {
      return apiError(500, "Failed to load shop listings for audit", error);
    }

    const rows = (data || []) as ShopListing[];
    const result = auditShop(rows);

    return NextResponse.json(result);
  } catch (err) {
    return apiError(500, "Failed to audit shop listings", err);
  }
}
