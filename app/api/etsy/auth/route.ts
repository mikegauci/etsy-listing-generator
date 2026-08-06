import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, createPkcePair } from "@/lib/etsy";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const state = randomBytes(16).toString("hex");
    const { verifier, challenge } = createPkcePair();
    const url = buildAuthUrl(state, challenge);

    const response = NextResponse.redirect(url);
    response.cookies.set("etsy_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    response.cookies.set("etsy_oauth_verifier", verifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (err) {
    return apiError(500, "OAuth init failed", err);
  }
}
