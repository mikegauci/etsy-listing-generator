import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { computeKeywordStats } from "@/lib/keywords";
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
        .select(
          "id, etsy_listing_id, title, tags, description, views, num_favorers, taxonomy_path, category, price_amount, price_currency, state, url, synced_at"
        )
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
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const message = err instanceof Error ? err.message : "Failed to load shop data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
