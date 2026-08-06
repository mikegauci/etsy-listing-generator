import { NextResponse } from "next/server";
import { fetchAllShopListings, mapEtsyListingToRow } from "@/lib/etsy";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { apiError } from "@/lib/api";

export const maxDuration = 120;

async function fetchAllExistingListingIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<{ etsy_listing_id: number; state: string }[]> {
  const pageSize = 1000;
  const all: { etsy_listing_id: number; state: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("shop_listings")
      .select("etsy_listing_id, state")
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load existing listings: ${error.message}`);
    }

    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export async function POST() {
  try {
    if (!hasSupabaseConfig()) {
      return apiError(500, "Supabase is not configured");
    }

    const listings = await fetchAllShopListings();
    const rows = listings.map(mapEtsyListingToRow);
    const supabase = getSupabaseAdmin();
    const activeIds = rows.map((r) => r.etsy_listing_id);

    // Refuse to wipe the catalog if Etsy returned nothing but we still have rows.
    if (activeIds.length === 0) {
      const existing = await fetchAllExistingListingIds(supabase);
      if (existing.length > 0) {
        return apiError(
          502,
          "Etsy returned zero active listings; refusing to delete local catalog"
        );
      }
      return NextResponse.json({
        ok: true,
        synced: 0,
        active: 0,
        removed: 0,
      });
    }

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

    // Remove non-active / stale listings (paginated so shops >1000 are safe)
    const existing = await fetchAllExistingListingIds(supabase);
    const activeIdSet = new Set(activeIds);
    const staleIds = existing
      .filter(
        (row) =>
          row.state !== "active" || !activeIdSet.has(row.etsy_listing_id)
      )
      .map((row) => row.etsy_listing_id);

    let removed = 0;
    if (staleIds.length > 0) {
      const deleteChunk = 200;
      for (let i = 0; i < staleIds.length; i += deleteChunk) {
        const chunk = staleIds.slice(i, i + deleteChunk);
        const { error: deleteError } = await supabase
          .from("shop_listings")
          .delete()
          .in("etsy_listing_id", chunk);
        if (deleteError) {
          throw new Error(
            `Failed to remove inactive listings: ${deleteError.message}`
          );
        }
        removed += chunk.length;
      }
    }

    return NextResponse.json({
      ok: true,
      synced: upserted,
      active: upserted,
      removed,
    });
  } catch (err) {
    return apiError(500, "Sync failed", err);
  }
}
