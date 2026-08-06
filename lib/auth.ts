const COOKIE_NAME = "me_studio_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "AUTH_SECRET must be set to a long random string (do not reuse APP_PASSWORD)"
    );
  }
  return secret;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

async function hmacHex(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return toHex(sig);
}

/** Constant-time compare that does not early-return on length (pads to max). */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    const ac = i < a.length ? a.charCodeAt(i) : 0;
    const bc = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ac ^ bc;
  }
  return mismatch === 0;
}

export async function createSessionToken(): Promise<string> {
  const payload = `ok:${Date.now()}:${MAX_AGE_SECONDS}`;
  const signature = await hmacHex(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload.startsWith("ok:")) return false;

  let expected: string;
  try {
    expected = await hmacHex(payload);
  } catch {
    return false;
  }
  if (!timingSafeEqual(signature, expected)) return false;

  const segments = payload.split(":");
  const issuedAt = Number(segments[1]);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_AGE_SECONDS * 1000) return false;

  return true;
}

export function checkPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(password, expected);
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
