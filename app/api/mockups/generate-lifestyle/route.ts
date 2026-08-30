import { NextResponse } from "next/server";
import { z } from "zod";
import {
  editLifestyleMockup,
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
  lifestyleRunStoragePath,
  uploadMockupBytes,
} from "@/lib/mockup-storage";

export const maxDuration = 180;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shopId: z.string(),
  runId: z.string().uuid(),
  sceneId: z.string().min(1).max(100),
  colorId: z.string().min(1).max(100),
  artworkUrl: z.string().url(),
  artworkName: z.string().max(300).optional(),
  personalizationName: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limited = rateLimit(`mockup-lifestyle-generate:${ip}`, 20, 60_000);
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
    if (!shop.lifestyleMockups) {
      return NextResponse.json(
        { error: "This shop has no lifestyle mockup configuration" },
        { status: 400 }
      );
    }

    const scene = shop.lifestyleMockups.scenes.find(
      (s) => s.id === input.sceneId
    );
    const color = shop.lifestyleMockups.colors.find(
      (c) => c.id === input.colorId
    );
    if (!scene || !color) {
      return NextResponse.json(
        { error: "Unknown scene or colour" },
        { status: 400 }
      );
    }

    const prompt = shop.lifestyleMockups.buildPrompt({
      scene,
      color,
      personalizationName: input.personalizationName,
    });

    let publicUrl: string | null = null;
    let storagePath: string | null = null;
    let errorMessage: string | null = null;

    try {
      const { bytes: artworkBytes } = await fetchImageBytes(input.artworkUrl);
      const result = await editLifestyleMockup({
        prompt,
        artworkBytes: Buffer.from(artworkBytes),
        artworkName: input.artworkName || "artwork.png",
      });

      if (hasSupabaseConfig()) {
        storagePath = lifestyleRunStoragePath(
          shop.id,
          input.runId,
          scene.id,
          color.id
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
        base_image_id: scene.id,
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
        {
          error: errorMessage,
          sceneId: scene.id,
          colorId: color.id,
          prompt,
          status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sceneId: scene.id,
      sceneLabel: scene.label,
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
    return apiError(500, "Lifestyle mockup generation failed", err);
  }
}
