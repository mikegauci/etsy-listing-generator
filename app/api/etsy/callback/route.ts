import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  getRedirectUri,
  isAllowedOAuthOrigin,
  saveTokens,
} from "@/lib/etsy";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const callbackOrigin = request.nextUrl.origin;
  const appUrl =
    (isAllowedOAuthOrigin(callbackOrigin) ? callbackOrigin : null) ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 }
    );
  }

  const shopDataBase = appUrl.replace(/\/$/, "");

  if (error) {
    return NextResponse.redirect(
      `${shopDataBase}/shop-data?etsy=error&message=${encodeURIComponent(error)}`
    );
  }

  const savedState = request.cookies.get("etsy_oauth_state")?.value;
  const verifier = request.cookies.get("etsy_oauth_verifier")?.value;
  const savedRedirect = request.cookies.get("etsy_oauth_redirect")?.value;
  const redirectUri =
    savedRedirect || getRedirectUri(callbackOrigin);

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return NextResponse.redirect(
      `${shopDataBase}/shop-data?etsy=error&message=${encodeURIComponent("Invalid OAuth state")}`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier, redirectUri);
    await saveTokens(tokens);

    const response = NextResponse.redirect(
      `${shopDataBase}/shop-data?etsy=connected`
    );
    response.cookies.set("etsy_oauth_state", "", { path: "/", maxAge: 0 });
    response.cookies.set("etsy_oauth_verifier", "", { path: "/", maxAge: 0 });
    response.cookies.set("etsy_oauth_redirect", "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    console.error("[etsy/callback]", err);
    return NextResponse.redirect(
      `${shopDataBase}/shop-data?etsy=error&message=${encodeURIComponent("Token exchange failed")}`
    );
  }
}
