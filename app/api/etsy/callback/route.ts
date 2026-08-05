import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, saveTokens } from "@/lib/etsy";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/shop-data?etsy=error&message=${encodeURIComponent(error)}`
    );
  }

  const savedState = request.cookies.get("etsy_oauth_state")?.value;
  const verifier = request.cookies.get("etsy_oauth_verifier")?.value;

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return NextResponse.redirect(
      `${appUrl}/shop-data?etsy=error&message=${encodeURIComponent("Invalid OAuth state")}`
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, verifier);
    await saveTokens(tokens);

    const response = NextResponse.redirect(`${appUrl}/shop-data?etsy=connected`);
    response.cookies.set("etsy_oauth_state", "", { path: "/", maxAge: 0 });
    response.cookies.set("etsy_oauth_verifier", "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return NextResponse.redirect(
      `${appUrl}/shop-data?etsy=error&message=${encodeURIComponent(message)}`
    );
  }
}
