import sharp from "sharp";

export const UPSCALE_TARGET_PX = 2048;
export const UPSCALE_JPEG_QUALITY = 90;

export async function resizeImageTo2K(bytes: ArrayBuffer): Promise<Buffer> {
  const input = Buffer.from(bytes);
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  let pipeline = sharp(input);
  if (
    width > UPSCALE_TARGET_PX ||
    height > UPSCALE_TARGET_PX
  ) {
    pipeline = pipeline.resize(UPSCALE_TARGET_PX, UPSCALE_TARGET_PX, {
      fit: "fill",
    });
  }

  return pipeline.jpeg({ quality: UPSCALE_JPEG_QUALITY }).toBuffer();
}
