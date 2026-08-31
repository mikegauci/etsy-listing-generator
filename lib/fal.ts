import { fal } from "@fal-ai/client";
import { logMockupImageRequest } from "./mockup-image-log";

export const FAL_EDIT_MODEL =
  process.env.FAL_IMAGE_MODEL || "fal-ai/nano-banana-2/edit";

export const FAL_UPSCALE_MODEL =
  process.env.FAL_UPSCALE_MODEL || "fal-ai/recraft/upscale/crisp";

export type FalResolution = "0.5K" | "1K" | "2K" | "4K";
export type FalAspectRatio =
  | "auto"
  | "1:1"
  | "4:5"
  | "5:4"
  | "3:4"
  | "4:3"
  | "2:3"
  | "3:2"
  | "9:16"
  | "16:9";
export type FalOutputFormat = "jpeg" | "png" | "webp";

export type MockupOutputSettings = {
  resolution: FalResolution;
  aspectRatio: FalAspectRatio;
  outputFormat: FalOutputFormat;
};

const RESOLUTIONS = new Set<FalResolution>(["0.5K", "1K", "2K", "4K"]);
const FORMATS = new Set<FalOutputFormat>(["jpeg", "png", "webp"]);

let configured = false;

function credentials(): string {
  const key = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!key) throw new Error("FAL_API_KEY is not set");
  return key;
}

function ensureFalConfig(): void {
  if (configured) return;
  fal.config({ credentials: credentials() });
  configured = true;
}

export function resolveMockupOutput(
  overrides?: Partial<MockupOutputSettings>
): MockupOutputSettings {
  const resolutionRaw = (
    overrides?.resolution ||
    process.env.FAL_MOCKUP_RESOLUTION ||
    "0.5K"
  ).trim() as FalResolution;
  const aspectRatio = (overrides?.aspectRatio ||
    process.env.FAL_MOCKUP_ASPECT_RATIO ||
    "1:1") as FalAspectRatio;
  const outputFormatRaw = (
    overrides?.outputFormat ||
    process.env.FAL_MOCKUP_OUTPUT_FORMAT ||
    "jpeg"
  ).trim().toLowerCase() as FalOutputFormat;

  return {
    resolution: RESOLUTIONS.has(resolutionRaw) ? resolutionRaw : "0.5K",
    aspectRatio,
    outputFormat: FORMATS.has(outputFormatRaw) ? outputFormatRaw : "jpeg",
  };
}

export function outputFormatExtension(format: FalOutputFormat): string {
  if (format === "jpeg") return "jpg";
  return format;
}

export function outputFormatMime(format: FalOutputFormat): string {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

export async function uploadToFal(file: File | Blob, fileName?: string): Promise<string> {
  ensureFalConfig();
  const payload =
    file instanceof File
      ? file
      : new File([file], fileName || "upload.png", {
          type: file.type || "image/png",
        });
  return fal.storage.upload(payload);
}

export type FalEditResult = {
  url: string;
  contentType: string;
  fileName?: string;
  description?: string;
};

export async function editImage(opts: {
  prompt: string;
  imageUrls: string[];
  resolution?: FalResolution;
  aspectRatio?: FalAspectRatio;
  outputFormat?: FalOutputFormat;
}): Promise<FalEditResult> {
  ensureFalConfig();
  const output = resolveMockupOutput({
    resolution: opts.resolution,
    aspectRatio: opts.aspectRatio,
    outputFormat: opts.outputFormat,
  });

  const result = await fal.subscribe(FAL_EDIT_MODEL, {
    input: {
      prompt: opts.prompt,
      image_urls: opts.imageUrls,
      num_images: 1,
      resolution: output.resolution,
      aspect_ratio: output.aspectRatio,
      output_format: output.outputFormat,
      limit_generations: true,
    },
    logs: false,
  });

  const image = result.data?.images?.[0];
  if (!image?.url) {
    throw new Error("FAL returned no image URL");
  }

  return {
    url: image.url,
    contentType: image.content_type || outputFormatMime(output.outputFormat),
    fileName: image.file_name,
    description: result.data?.description,
  };
}

export type FalUpscaleResult = {
  url: string;
  contentType: string;
  fileName?: string;
};

export async function upscaleImageCrisp(
  imageUrl: string
): Promise<FalUpscaleResult> {
  ensureFalConfig();

  logMockupImageRequest({
    operation: "upscale",
    provider: "fal",
    model: FAL_UPSCALE_MODEL,
    resolution: "2K",
    format: "jpeg",
  });

  const result = await fal.subscribe(FAL_UPSCALE_MODEL, {
    input: { image_url: imageUrl },
    logs: false,
  });

  const image = result.data?.image;
  if (!image?.url) {
    throw new Error("FAL upscale returned no image URL");
  }

  return {
    url: image.url,
    contentType: image.content_type || "image/png",
    fileName: image.file_name,
  };
}
