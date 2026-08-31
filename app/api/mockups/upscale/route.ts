import { NextResponse } from "next/server";
import { z } from "zod";
import { FAL_UPSCALE_MODEL, upscaleImageCrisp } from "@/lib/fal";
import { apiError } from "@/lib/api";
import { getShop, isValidShopId } from "@/lib/shops";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { resizeImageTo2K, UPSCALE_JPEG_QUALITY, UPSCALE_TARGET_PX } from "@/lib/image-resize";
import { logMockupImageRequest } from "@/lib/mockup-image-log";
import {
  fetchImageBytes,
  lifestyleUpscaledStoragePath,
  upscaledStoragePath,
  uploadMockupBytes,
} from "@/lib/mockup-storage";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shopId: z.string(),
  runId: z.string().uuid(),
  colorId: z.string().min(1).max(100),
  sceneId: z.string().min(1).max(100).optional(),
  sourceUrl: z.string().url(),
  colorLabel: z.string().max(100).optional(),
  colorHex: z.string().max(20).optional(),
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limited = rateLimit(`mockup-upscale:${ip}`, 20, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many upscale requests. Try again shortly." },
        { status: 429 }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    if (!isValidShopId(input.shopId)) {
      return NextResponse.json({ error: "Unknown shop" }, { status: 400 });
    }

    const shop = getShop(input.shopId);
    const isLifestyle = Boolean(input.sceneId);

    if (isLifestyle) {
      if (!shop.lifestyleMockups) {
        return NextResponse.json(
          { error: "This shop has no lifestyle mockup configuration" },
          { status: 400 }
        );
      }
    } else if (!shop.mockups) {
      return NextResponse.json(
        { error: "This shop has no mockup configuration" },
        { status: 400 }
      );
    }

    const colors = isLifestyle
      ? shop.lifestyleMockups!.colors
      : shop.mockups!.colors;
    const color = colors.find((c) => c.id === input.colorId);
    if (!color) {
      return NextResponse.json({ error: "Unknown colour" }, { status: 400 });
    }

    if (isLifestyle) {
      const scene = shop.lifestyleMockups!.scenes.find(
        (s) => s.id === input.sceneId
      );
      if (!scene) {
        return NextResponse.json({ error: "Unknown scene" }, { status: 400 });
      }
    }

    let falUrl: string | null = null;
    let publicUrl: string | null = null;
    let storagePath: string | null = null;
    let errorMessage: string | null = null;

    try {
      const result = await upscaleImageCrisp(input.sourceUrl);
      falUrl = result.url;

      if (hasSupabaseConfig()) {
        const { bytes } = await fetchImageBytes(result.url);
        const resizedBytes = await resizeImageTo2K(bytes);
        storagePath = isLifestyle
          ? lifestyleUpscaledStoragePath(
              shop.id,
              input.runId,
              input.sceneId!,
              input.colorId
            )
          : upscaledStoragePath(shop.id, input.runId, input.colorId);
        publicUrl = await uploadMockupBytes({
          path: storagePath,
          bytes: resizedBytes,
          contentType: "image/jpeg",
        });
        logMockupImageRequest({
          operation: "upscale-save",
          provider: "sharp",
          model: "resize-to-2k",
          resolution: `${UPSCALE_TARGET_PX}x${UPSCALE_TARGET_PX}`,
          quality: String(UPSCALE_JPEG_QUALITY),
          format: "jpeg",
        });
      } else {
        publicUrl = result.url;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Upscale failed";
    }

    const status = errorMessage ? "failed" : "succeeded";

    if (hasSupabaseConfig()) {
      const supabase = getSupabaseAdmin();
      await supabase.from("generated_mockups").insert({
        run_id: input.runId,
        shop_id: shop.id,
        base_image_id: isLifestyle ? input.sceneId! : "upscale",
        color_id: input.colorId,
        color_label: input.colorLabel ?? color.label,
        color_hex: input.colorHex ?? color.hex,
        prompt: `Recraft Crisp upscale from ${input.sourceUrl}`,
        fal_url: falUrl,
        storage_path: storagePath,
        public_url: publicUrl,
        model: FAL_UPSCALE_MODEL,
        resolution: "2K",
        aspect_ratio: "1:1",
        output_format: "jpeg",
        status,
        error: errorMessage,
      });
    }

    if (errorMessage) {
      return NextResponse.json(
        { error: errorMessage, colorId: input.colorId, status },
        { status: 502 }
      );
    }

    return NextResponse.json({
      colorId: input.colorId,
      sceneId: input.sceneId ?? null,
      falUrl,
      publicUrl,
      resolution: "2K",
      status,
    });
  } catch (err) {
    return apiError(500, "Mockup upscale failed", err);
  }
}
