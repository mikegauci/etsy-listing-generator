import { NextResponse } from "next/server";
import { z } from "zod";
import {
  editVariationMockup,
  formatOpenAiImageError,
  LIFESTYLE_IMAGE_SETTINGS,
  OPENAI_IMAGE_MODEL,
} from "@/lib/openai-image";
import { apiError } from "@/lib/api";
import { getShop, isValidShopId } from "@/lib/shops";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import {
  fetchImageBytes,
  runStoragePath,
  uploadMockupBytes,
} from "@/lib/mockup-storage";

export const maxDuration = 180;
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

    const prompt = shop.mockups.buildPrompt({
      base,
      color,
      personalizationName: input.personalizationName,
    });

    let publicUrl: string | null = null;
    let storagePath: string | null = null;
    let errorMessage: string | null = null;

    try {
      const [{ bytes: baseBytes }, { bytes: artworkBytes }] = await Promise.all([
        fetchImageBytes(base.url),
        fetchImageBytes(input.artworkUrl),
      ]);

      const result = await editVariationMockup({
        prompt,
        baseBytes: Buffer.from(baseBytes),
        baseName: `${base.id}.png`,
        artworkBytes: Buffer.from(artworkBytes),
        artworkName: input.artworkName || "artwork.png",
      });

      if (hasSupabaseConfig()) {
        storagePath = runStoragePath(
          shop.id,
          input.runId,
          color.id,
          LIFESTYLE_IMAGE_SETTINGS.outputFormat
        );
        publicUrl = await uploadMockupBytes({
          path: storagePath,
          bytes: result.bytes,
          contentType: result.contentType,
        });
      } else {
        const b64 = result.bytes.toString("base64");
        publicUrl = `data:${result.contentType};base64,${b64}`;
      }
    } catch (err) {
      errorMessage = formatOpenAiImageError(err);
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
        fal_url: null,
        storage_path: storagePath,
        public_url: publicUrl,
        model: OPENAI_IMAGE_MODEL,
        resolution: LIFESTYLE_IMAGE_SETTINGS.size,
        aspect_ratio: "1:1",
        output_format: LIFESTYLE_IMAGE_SETTINGS.outputFormat,
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
      publicUrl,
      resolution: LIFESTYLE_IMAGE_SETTINGS.size,
      aspectRatio: "1:1",
      outputFormat: LIFESTYLE_IMAGE_SETTINGS.outputFormat,
      status,
    });
  } catch (err) {
    return apiError(500, "Mockup generation failed", err);
  }
}
