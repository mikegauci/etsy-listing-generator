import { NextResponse } from "next/server";

/** Safe client-facing error; full detail stays in the server log. */
export function apiError(
  status: number,
  clientMessage: string,
  detail?: unknown
): NextResponse {
  if (detail !== undefined) {
    console.error(`[api] ${clientMessage}`, detail);
  }
  return NextResponse.json({ error: clientMessage }, { status });
}
