import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import {
  extensionFromUrl,
  isAllowedMockupDownloadUrl,
  safeDownloadFilename,
} from "@/lib/mockup-download";
import { fetchImageBytes } from "@/lib/mockup-storage";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const limited = rateLimit(`mockup-download:${ip}`, 60, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many download requests. Try again shortly." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sourceUrl = searchParams.get("url");
    const filenameParam = searchParams.get("filename");

    if (!sourceUrl) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    if (!isAllowedMockupDownloadUrl(sourceUrl)) {
      return NextResponse.json({ error: "Invalid download URL" }, { status: 400 });
    }

    const ext = extensionFromUrl(sourceUrl, "jpg");
    const filename = safeDownloadFilename(
      filenameParam || `mockup.${ext}`
    );

    const { bytes, contentType } = await fetchImageBytes(sourceUrl);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return apiError(500, "Mockup download failed", err);
  }
}
