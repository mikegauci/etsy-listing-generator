import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  MAX_AGE_SECONDS,
  checkPassword,
  createSessionToken,
} from "@/lib/auth";
import { apiError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const { allowed, retryAfterSec } = rateLimit(
    `login:${clientKey(request)}`,
    8,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = String((body as { password?: string }).password || "");

  if (!checkPassword(password)) {
    return apiError(401, "Invalid password");
  }

  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, await createSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
    return response;
  } catch (err) {
    return apiError(500, "Auth is misconfigured", err);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
