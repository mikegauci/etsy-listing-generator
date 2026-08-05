import { NextResponse } from "next/server";
import { fetchAllShopListings, mapEtsyListingToRow } from "@/lib/etsy";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export async function POST() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const listings = await fetchAllShopListings();
    const rows = listings.map(mapEtsyListingToRow);
    const supabase = getSupabaseAdmin();
    const activeIds = rows.map((r) => r.etsy_listing_id);

    // Upsert active listings in chunks
    const chunkSize = 50;
    let upserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("shop_listings")
        .upsert(chunk, { onConflict: "etsy_listing_id" });
      if (error) {
        throw new Error(`Upsert failed: ${error.message}`);
      }
      upserted += chunk.length;
    }

    // Remove non-active / stale listings so shop data only keeps active catalog
    let removed = 0;
    if (activeIds.length > 0) {
      const { data: existing, error: existingError } = await supabase
        .from("shop_listings")
        .select("etsy_listing_id, state");
      if (existingError) {
        throw new Error(`Failed to load existing listings: ${existingError.message}`);
      }

      const activeIdSet = new Set(activeIds);
      const staleIds = (existing || [])
        .filter(
          (row) =>
            row.state !== "active" || !activeIdSet.has(row.etsy_listing_id)
        )
        .map((row) => row.etsy_listing_id);

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("shop_listings")
          .delete()
          .in("etsy_listing_id", staleIds);
        if (deleteError) {
          throw new Error(`Failed to remove inactive listings: ${deleteError.message}`);
        }
        removed = staleIds.length;
      }
    } else {
      // No active listings returned — clear table of non-active leftovers
      const { data: deleted, error: deleteError } = await supabase
        .from("shop_listings")
        .delete()
        .neq("state", "active")
        .select("etsy_listing_id");
      if (deleteError) {
        throw new Error(`Failed to remove inactive listings: ${deleteError.message}`);
      }
      removed = deleted?.length || 0;
    }

    return NextResponse.json({
      ok: true,
      synced: upserted,
      active: upserted,
      removed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
