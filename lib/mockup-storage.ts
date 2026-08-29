import { getSupabaseAdmin } from "./supabase";
import {
  outputFormatExtension,
  outputFormatMime,
  type FalOutputFormat,
} from "./fal";

const MOCKUPS_BUCKET = "mockups";

export function mockupPublicUrl(storagePath: string): string {
  const base =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${MOCKUPS_BUCKET}/${storagePath}`;
}

export async function uploadMockupBytes(opts: {
  path: string;
  bytes: ArrayBuffer | Buffer;
  contentType: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const body =
    opts.bytes instanceof Buffer
      ? opts.bytes
      : new Uint8Array(opts.bytes);
  const { error } = await supabase.storage
    .from(MOCKUPS_BUCKET)
    .upload(opts.path, body, {
      contentType: opts.contentType,
      upsert: true,
    });
  if (error) throw new Error(error.message);
  return mockupPublicUrl(opts.path);
}

export async function fetchImageBytes(url: string): Promise<{
  bytes: ArrayBuffer;
  contentType: string;
}> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`Failed to download image (${res.status})`);
  }
  const bytes = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { bytes, contentType };
}

export function runStoragePath(
  shopId: string,
  runId: string,
  colorId: string,
  format: FalOutputFormat
): string {
  const ext = outputFormatExtension(format);
  return `runs/${shopId}/${runId}/${colorId}.${ext}`;
}

export function upscaledStoragePath(
  shopId: string,
  runId: string,
  colorId: string
): string {
  return `runs/${shopId}/${runId}/${colorId}-2k.png`;
}

export function baseStoragePath(shopId: string, baseId: string): string {
  return `bases/${shopId}/${baseId}.png`;
}

export function mimeForFormat(format: FalOutputFormat): string {
  return outputFormatMime(format);
}

export async function ensureBaseImageInStorage(opts: {
  shopId: string;
  baseId: string;
  sourceUrl: string;
}): Promise<string> {
  const path = baseStoragePath(opts.shopId, opts.baseId);
  const publicUrl = mockupPublicUrl(path);
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.storage
    .from(MOCKUPS_BUCKET)
    .list(`bases/${opts.shopId}`, { search: `${opts.baseId}.png` });
  if (existing?.some((f) => f.name === `${opts.baseId}.png`)) {
    return publicUrl;
  }
  const { bytes, contentType } = await fetchImageBytes(opts.sourceUrl);
  await uploadMockupBytes({ path, bytes, contentType });
  return publicUrl;
}
