import { NextResponse } from "next/server";
import { z } from "zod";
import {
  editImage,
  FAL_EDIT_MODEL,
  resolveMockupOutput,
  type FalAspectRatio,
  type FalOutputFormat,
  type FalResolution,
} from "@/lib/fal";
import { apiError } from "@/lib/api";
import { getShop, isValidShopId } from "@/lib/shops";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import {
  ensureBaseImageInStorage,
  fetchImageBytes,
  mimeForFormat,
  runStoragePath,
  uploadMockupBytes,
} from "@/lib/mockup-storage";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shopId: z.string(),
  runId: z.string().uuid(),
  baseImageId: z.string().min(1).max(100),
  colorId: z.string().min(1).max(100),
  artworkUrl: z.string().url(),
  artworkName: z.string().max(300).optional(),
  personalizationName: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  resolution: z.enum(["0.5K", "1K", "2K", "4K"]).optional(),
  aspectRatio: z.string().optional(),
  outputFormat: z.enum(["jpeg", "png", "webp"]).optional(),
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limited = rateLimit(`mockup-generate:${ip}`, 30, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many generation requests. Try again shortly." },
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

    const base = shop.mockups.bases.find((b) => b.id === input.baseImageId);
    const color = shop.mockups.colors.find((c) => c.id === input.colorId);
    if (!base || !color) {
      return NextResponse.json({ error: "Unknown base or colour" }, { status: 400 });
    }

    const output = resolveMockupOutput({
      resolution: input.resolution as FalResolution | undefined,
      aspectRatio: input.aspectRatio as FalAspectRatio | undefined,
      outputFormat: input.outputFormat as FalOutputFormat | undefined,
    });

    const baseUrl = await ensureBaseImageInStorage({
      shopId: shop.id,
      baseId: base.id,
      sourceUrl: base.url,
    });

    const prompt = shop.mockups.buildPrompt({
      base,
      color,
      personalizationName: input.personalizationName,
    });

    let falUrl: string | null = null;
    let publicUrl: string | null = null;
    let storagePath: string | null = null;
    let errorMessage: string | null = null;

    try {
      const result = await editImage({
        prompt,
        imageUrls: [baseUrl, input.artworkUrl],
        resolution: output.resolution,
        aspectRatio: output.aspectRatio,
        outputFormat: output.outputFormat,
      });
      falUrl = result.url;

      if (hasSupabaseConfig()) {
        const { bytes } = await fetchImageBytes(result.url);
        storagePath = runStoragePath(
          shop.id,
          input.runId,
          color.id,
          output.outputFormat
        );
        publicUrl = await uploadMockupBytes({
          path: storagePath,
          bytes,
          contentType: mimeForFormat(output.outputFormat),
        });
      } else {
        publicUrl = result.url;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Generation failed";
    }

    const status = errorMessage ? "failed" : "succeeded";

    if (hasSupabaseConfig()) {
      const supabase = getSupabaseAdmin();
      await supabase.from("generated_mockups").insert({
        run_id: input.runId,
        shop_id: shop.id,
        base_image_id: base.id,
        color_id: color.id,
        color_label: color.label,
        color_hex: color.hex,
        prompt,
        artwork_url: input.artworkUrl,
        artwork_name: input.artworkName ?? null,
        personalization_name: input.personalizationName ?? null,
        fal_url: falUrl,
        storage_path: storagePath,
        public_url: publicUrl,
        model: FAL_EDIT_MODEL,
        resolution: output.resolution,
        aspect_ratio: output.aspectRatio,
        output_format: output.outputFormat,
        status,
        error: errorMessage,
      });
    }

    if (errorMessage) {
      return NextResponse.json(
        { error: errorMessage, colorId: color.id, prompt, status },
        { status: 502 }
      );
    }

    return NextResponse.json({
      colorId: color.id,
      colorLabel: color.label,
      colorHex: color.hex,
      prompt,
      falUrl,
      publicUrl,
      resolution: output.resolution,
      aspectRatio: output.aspectRatio,
      outputFormat: output.outputFormat,
      status,
    });
  } catch (err) {
    return apiError(500, "Mockup generation failed", err);
  }
}
