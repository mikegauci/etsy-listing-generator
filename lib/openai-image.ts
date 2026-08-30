import OpenAI, { toFile } from "openai";

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
  const client = openAiClient();
  const image = await toFile(opts.artworkBytes, opts.artworkName, {
    type: "image/png",
  });

  const response = await client.images.edit({
    model: OPENAI_IMAGE_MODEL,
    image: [image],
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
