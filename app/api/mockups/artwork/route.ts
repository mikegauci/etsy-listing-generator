import { NextResponse } from "next/server";
import { uploadToFal } from "@/lib/fal";
import { apiError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_ARTWORK_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limited = rateLimit(`mockup-artwork:${ip}`, 20, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many uploads. Try again shortly." },
        { status: 429 }
      );
    }

    const form = await request.formData();
    const file = form.get("artwork");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "artwork file required" }, { status: 400 });
    }
    if (file.size > MAX_ARTWORK_BYTES) {
      return NextResponse.json({ error: "Artwork file too large (max 15MB)" }, { status: 400 });
    }
    const type = (file.type || "").toLowerCase();
    if (!type.includes("png") && !file.name.toLowerCase().endsWith(".png")) {
      return NextResponse.json({ error: "Artwork must be a PNG" }, { status: 400 });
    }

    const artworkUrl = await uploadToFal(file, file.name || "artwork.png");
    return NextResponse.json({
      artworkUrl,
      artworkName: file.name || "artwork.png",
    });
  } catch (err) {
    return apiError(500, "Artwork upload failed", err);
  }
}
