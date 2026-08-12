import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, createPkcePair, getRedirectUri } from "@/lib/etsy";
import { apiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const state = randomBytes(16).toString("hex");
    const { verifier, challenge } = createPkcePair();
    const redirectUri = getRedirectUri(request.nextUrl.origin);
    const url = buildAuthUrl(state, challenge, redirectUri);
    const secure = request.nextUrl.protocol === "https:";

    const response = NextResponse.redirect(url);
    response.cookies.set("etsy_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("etsy_oauth_verifier", verifier, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("etsy_oauth_redirect", redirectUri, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (err) {
    return apiError(500, "OAuth init failed", err);
  }
}
