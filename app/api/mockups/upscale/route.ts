import { NextResponse } from "next/server";
import { z } from "zod";
import { FAL_UPSCALE_MODEL, upscaleImageCrisp } from "@/lib/fal";
import { apiError } from "@/lib/api";
import { getShop, isValidShopId } from "@/lib/shops";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import {
  fetchImageBytes,
  upscaledStoragePath,
  uploadMockupBytes,
} from "@/lib/mockup-storage";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shopId: z.string(),
  runId: z.string().uuid(),
  colorId: z.string().min(1).max(100),
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
    if (!shop.mockups) {
      return NextResponse.json(
        { error: "This shop has no mockup configuration" },
        { status: 400 }
      );
    }

    const color = shop.mockups.colors.find((c) => c.id === input.colorId);
    if (!color) {
      return NextResponse.json({ error: "Unknown colour" }, { status: 400 });
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
        storagePath = upscaledStoragePath(
          shop.id,
          input.runId,
          input.colorId
        );
        publicUrl = await uploadMockupBytes({
          path: storagePath,
          bytes,
          contentType: result.contentType || "image/png",
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
        base_image_id: "upscale",
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
        output_format: "png",
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
      falUrl,
      publicUrl,
      resolution: "2K",
      status,
    });
  } catch (err) {
    return apiError(500, "Mockup upscale failed", err);
  }
}
