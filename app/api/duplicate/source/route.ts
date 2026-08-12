import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { fetchShopListingDetail } from "@/lib/etsy";
import { SHOP_LISTING_COLUMNS } from "@/lib/shop-listings";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = Number(searchParams.get("listingId"));
    if (!Number.isFinite(listingId) || listingId <= 0) {
      return apiError(400, "listingId is required");
    }

    if (!hasSupabaseConfig()) {
      return apiError(503, "Supabase is not configured");
    }

    const supabase = getSupabaseAdmin();
    const { data: synced, error } = await supabase
      .from("shop_listings")
      .select(SHOP_LISTING_COLUMNS)
      .eq("etsy_listing_id", listingId)
      .eq("state", "active")
      .maybeSingle();

    if (error) {
      return apiError(500, "Failed to verify synced listing", error);
    }
    if (!synced) {
      return apiError(
        404,
        "Listing not found in active synced shop data. Sync from Shop data first."
      );
    }

    const listing = await fetchShopListingDetail(listingId);
    if (listing.state !== "active") {
      return apiError(400, "Only active listings can be duplicated");
    }

    const images = [...(listing.images || [])]
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((img) => ({
        listingImageId: img.listing_image_id,
        rank: img.rank ?? 0,
        altText: img.alt_text || "",
        urlThumb: img.url_170x135 || img.url_75x75 || null,
        urlFull: img.url_fullxfull || img.url_570xN || null,
      }));

    const videos = (listing.videos || [])
      .filter((v) => v.video_state === "active" || !v.video_state)
      .map((v) => ({
        videoId: v.video_id,
        thumbnailUrl: v.thumbnail_url || null,
        videoUrl: v.video_url || null,
      }));

    return NextResponse.json({
      listingId: listing.listing_id,
      title: listing.title || "",
      description: listing.description || "",
      tags: listing.tags || [],
      url: listing.url || null,
      images,
      video: videos[0] || null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load listing";
    if (message.includes("Connect via")) {
      return apiError(401, "Etsy is not connected. Connect from Shop data.");
    }
    return apiError(500, message, err);
  }
}
