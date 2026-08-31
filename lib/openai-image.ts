import OpenAI, { toFile } from "openai";
import { logMockupImageRequest } from "./mockup-image-log";

export const OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

export type LifestyleImageSettings = {
  size: "1024x1024";
  quality: "medium";
  outputFormat: "jpeg";
};

export const LIFESTYLE_IMAGE_SETTINGS: LifestyleImageSettings = {
  size: "1024x1024",
  quality: "medium",
  outputFormat: "jpeg",
};

function openAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey, timeout: 180_000 });
}

export function formatOpenAiImageError(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    const code =
      typeof err.error === "object" &&
      err.error !== null &&
      "code" in err.error &&
      typeof err.error.code === "string"
        ? err.error.code
        : undefined;
    if (code === "moderation_blocked") {
      return "Image generation was blocked by content moderation. Try a different scene or artwork.";
    }
  }
  return err instanceof Error ? err.message : "Image generation failed";
}

export async function editLifestyleMockup(opts: {
  prompt: string;
  artworkBytes: Buffer;
  artworkName: string;
}): Promise<{ bytes: Buffer; contentType: "image/jpeg" }> {
  return editMockupImages({
    prompt: opts.prompt,
    images: [{ bytes: opts.artworkBytes, name: opts.artworkName }],
  });
}

export async function editVariationMockup(opts: {
  prompt: string;
  baseBytes: Buffer;
  baseName: string;
  artworkBytes: Buffer;
  artworkName: string;
}): Promise<{ bytes: Buffer; contentType: "image/jpeg" }> {
  return editMockupImages({
    prompt: opts.prompt,
    images: [
      { bytes: opts.baseBytes, name: opts.baseName },
      { bytes: opts.artworkBytes, name: opts.artworkName },
    ],
  });
}

async function editMockupImages(opts: {
  prompt: string;
  images: { bytes: Buffer; name: string }[];
}): Promise<{ bytes: Buffer; contentType: "image/jpeg" }> {
  const client = openAiClient();
  const files = await Promise.all(
    opts.images.map((img) =>
      toFile(img.bytes, img.name, { type: "image/png" })
    )
  );

  logMockupImageRequest({
    operation: "generate",
    provider: "openai",
    model: OPENAI_IMAGE_MODEL,
    resolution: LIFESTYLE_IMAGE_SETTINGS.size,
    quality: LIFESTYLE_IMAGE_SETTINGS.quality,
    format: LIFESTYLE_IMAGE_SETTINGS.outputFormat,
  });

  const response = await client.images.edit({
    model: OPENAI_IMAGE_MODEL,
    image: files,
    prompt: opts.prompt,
    size: LIFESTYLE_IMAGE_SETTINGS.size,
    quality: LIFESTYLE_IMAGE_SETTINGS.quality,
    output_format: LIFESTYLE_IMAGE_SETTINGS.outputFormat,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data");
  }

  return {
    bytes: Buffer.from(b64, "base64"),
    contentType: "image/jpeg",
  };
}
