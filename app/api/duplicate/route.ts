import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import {
  buildDraftInputFromSource,
  createDraftListing,
  fetchShopListingDetail,
  getListingInventory,
  updateListingInventory,
  uploadListingImage,
  uploadListingVideo,
  type EtsyListingInventory,
} from "@/lib/etsy";
import { SHOP_LISTING_COLUMNS } from "@/lib/shop-listings";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ETSY_TAG_MAX = 13;
const ETSY_TAG_LEN = 20;
const ETSY_TITLE_MAX = 140;
const ETSY_ALT_MAX = 500;
const ETSY_IMAGE_MAX = 20;

const photoKeepSchema = z.object({
  type: z.literal("keep"),
  listingImageId: z.number().int().positive(),
  altText: z.string().max(ETSY_ALT_MAX).optional().default(""),
});

const photoUploadSchema = z.object({
  type: z.literal("upload"),
  clientKey: z.string().min(1).max(80),
  altText: z.string().max(ETSY_ALT_MAX).optional().default(""),
});

const photoPlanSchema = z.array(z.union([photoKeepSchema, photoUploadSchema]));

const videoModeSchema = z.enum(["keep", "none", "upload"]);

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    if (tag.length > ETSY_TAG_LEN) {
      throw new Error(`Tag exceeds ${ETSY_TAG_LEN} characters: "${tag}"`);
    }
    seen.add(key);
    out.push(tag);
    if (out.length > ETSY_TAG_MAX) {
      throw new Error(`Etsy allows at most ${ETSY_TAG_MAX} tags`);
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    if (!hasSupabaseConfig()) {
      return apiError(503, "Supabase is not configured");
    }

    const form = await req.formData();
    const sourceListingId = Number(form.get("sourceListingId"));
    if (!Number.isFinite(sourceListingId) || sourceListingId <= 0) {
      return apiError(400, "sourceListingId is required");
    }

    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    if (!title) return apiError(400, "Title is required");
    if (title.length > ETSY_TITLE_MAX) {
      return apiError(400, `Title must be at most ${ETSY_TITLE_MAX} characters`);
    }
    if (!description) return apiError(400, "Description is required");

    let tagsRaw: unknown = [];
    try {
      tagsRaw = JSON.parse(String(form.get("tags") || "[]"));
    } catch {
      return apiError(400, "tags must be a JSON array");
    }
    if (!Array.isArray(tagsRaw) || !tagsRaw.every((t) => typeof t === "string")) {
      return apiError(400, "tags must be an array of strings");
    }
    let tags: string[];
    try {
      tags = normalizeTags(tagsRaw);
    } catch (err) {
      return apiError(400, err instanceof Error ? err.message : "Invalid tags");
    }

    let photoPlanRaw: unknown = [];
    try {
      photoPlanRaw = JSON.parse(String(form.get("photoPlan") || "[]"));
    } catch {
      return apiError(400, "photoPlan must be a JSON array");
    }
    const photoParsed = photoPlanSchema.safeParse(photoPlanRaw);
    if (!photoParsed.success) {
      return apiError(400, "Invalid photoPlan", photoParsed.error.flatten());
    }
    const photoPlan = photoParsed.data;
    if (!photoPlan.length) {
      return apiError(400, "At least one photo is required");
    }
    if (photoPlan.length > ETSY_IMAGE_MAX) {
      return apiError(400, `Etsy allows at most ${ETSY_IMAGE_MAX} images`);
    }

    const videoModeParsed = videoModeSchema.safeParse(
      String(form.get("videoMode") || "none")
    );
    if (!videoModeParsed.success) {
      return apiError(400, "videoMode must be keep, none, or upload");
    }
    const videoMode = videoModeParsed.data;
    const videoFile = form.get("video");
    if (videoMode === "upload") {
      if (!(videoFile instanceof File) || videoFile.size <= 0) {
        return apiError(400, "video file is required when videoMode is upload");
      }
    }

    const supabase = getSupabaseAdmin();
    const { data: synced, error: syncError } = await supabase
      .from("shop_listings")
      .select(SHOP_LISTING_COLUMNS)
      .eq("etsy_listing_id", sourceListingId)
      .eq("state", "active")
      .maybeSingle();

    if (syncError) {
      return apiError(500, "Failed to verify synced listing", syncError);
    }
    if (!synced) {
      return apiError(
        404,
        "Source listing not found in active synced shop data"
      );
    }

    const source = await fetchShopListingDetail(sourceListingId);
    if (source.state !== "active") {
      return apiError(400, "Only active listings can be duplicated");
    }

    const sourceImageIds = new Set(
      (source.images || []).map((img) => img.listing_image_id)
    );
    for (const step of photoPlan) {
      if (step.type === "keep" && !sourceImageIds.has(step.listingImageId)) {
        return apiError(
          400,
          `Photo ${step.listingImageId} is not on the source listing`
        );
      }
      if (step.type === "upload") {
        const file = form.get(`photo_${step.clientKey}`);
        if (!(file instanceof File) || file.size <= 0) {
          return apiError(
            400,
            `Missing upload file for photo key ${step.clientKey}`
          );
        }
      }
    }

    const sourceVideoId = source.videos?.find(
      (v) => v.video_state === "active" || !v.video_state
    )?.video_id;
    if (videoMode === "keep" && !sourceVideoId) {
      return apiError(400, "Source listing has no video to keep");
    }

    const draftInput = buildDraftInputFromSource(source, {
      title,
      description,
      tags,
    });
    const draft = await createDraftListing(draftInput);
    const newListingId = draft.listing_id;

    const mediaErrors: string[] = [];

    for (let i = 0; i < photoPlan.length; i++) {
      const step = photoPlan[i];
      const rank = i + 1;
      try {
        if (step.type === "keep") {
          await uploadListingImage({
            listingId: newListingId,
            listingImageId: step.listingImageId,
            rank,
            altText: step.altText || "",
          });
        } else {
          const file = form.get(`photo_${step.clientKey}`) as File;
          await uploadListingImage({
            listingId: newListingId,
            image: file,
            fileName: file.name || `photo-${rank}.jpg`,
            rank,
            altText: step.altText || "",
          });
        }
      } catch (err) {
        mediaErrors.push(
          `Image rank ${rank}: ${err instanceof Error ? err.message : "failed"}`
        );
      }
    }

    if (videoMode === "keep" && sourceVideoId) {
      try {
        await uploadListingVideo({
          listingId: newListingId,
          videoId: sourceVideoId,
        });
      } catch (err) {
        mediaErrors.push(
          `Video: ${err instanceof Error ? err.message : "failed to attach"}`
        );
      }
    } else if (videoMode === "upload" && videoFile instanceof File) {
      try {
        await uploadListingVideo({
          listingId: newListingId,
          video: videoFile,
          fileName: videoFile.name || "listing-video.mp4",
        });
      } catch (err) {
        mediaErrors.push(
          `Video: ${err instanceof Error ? err.message : "failed to upload"}`
        );
      }
    }

    let inventoryWarning: string | null = null;
    try {
      let inventory: EtsyListingInventory | undefined = source.inventory;
      if (!inventory?.products?.length) {
        inventory = await getListingInventory(sourceListingId);
      }
      if (inventory?.products?.length) {
        await updateListingInventory(newListingId, inventory);
      }
    } catch (err) {
      inventoryWarning =
        err instanceof Error
          ? err.message
          : "Failed to copy inventory/variations";
    }

    const url =
      draft.url ||
      `https://www.etsy.com/your/shops/me/listing-editor/edit/${newListingId}`;

    return NextResponse.json({
      listingId: newListingId,
      url,
      state: draft.state || "draft",
      mediaErrors,
      inventoryWarning,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create draft listing";
    if (message.includes("Connect via")) {
      return apiError(401, "Etsy is not connected. Connect from Shop data.");
    }
    if (
      message.includes("listings_w") ||
      message.includes("lacks scope")
    ) {
      return apiError(
        403,
        "Etsy token is missing write access. Go to Shop data → Reconnect Etsy and approve listings write permission, then try again."
      );
    }
    return apiError(500, message, err);
  }
}
