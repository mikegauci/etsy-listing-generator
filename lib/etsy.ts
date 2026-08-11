import { createHash, randomBytes } from "crypto";
import { getSupabaseAdmin, hasSupabaseConfig } from "./supabase";
import { scoreAgainstSubject, tokenizeSubject } from "./scoring";

const ETSY_API_BASE = "https://api.etsy.com/v3";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
const ETSY_AUTH_URL = "https://www.etsy.com/oauth/connect";

export { ETSY_API_BASE };

/** Serialize token refreshes so concurrent callers don't rotate the same refresh token twice. */
let refreshInFlight: Promise<string> | null = null;

export async function etsyFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidAccessToken();
  const headers = new Headers(init.headers);
  headers.set("x-api-key", getEtsyApiKeyHeader());
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${ETSY_API_BASE}${path}`, { ...init, headers });
}

/**
 * Etsy Open API expects `keystring:shared_secret` in x-api-key for this app type.
 * (Keystring alone returns 403: "Shared secret is required in x-api-key header.")
 */
export function getEtsyApiKeyHeader(): string {
  const key = process.env.ETSY_API_KEY;
  const secret = process.env.ETSY_SHARED_SECRET;
  if (!key || key === "your_keystring") {
    throw new Error("ETSY_API_KEY must be set");
  }
  if (!secret || secret === "your_shared_secret") {
    throw new Error("ETSY_SHARED_SECRET must be set");
  }
  return `${key}:${secret}`;
}

export function getEtsyClientId(): string {
  const key = process.env.ETSY_API_KEY;
  if (!key || key === "your_keystring") {
    throw new Error("ETSY_API_KEY must be set");
  }
  return key;
}

export function getRedirectUri(): string {
  const explicit = process.env.ETSY_REDIRECT_URI;
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("ETSY_REDIRECT_URI or NEXT_PUBLIC_APP_URL must be set");
  }
  return `${appUrl.replace(/\/$/, "")}/api/etsy/callback`;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getEtsyClientId(),
    redirect_uri: getRedirectUri(),
    scope: "listings_r listings_w shops_r",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${ETSY_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
};

export async function exchangeCodeForTokens(
  code: string,
  verifier: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getEtsyClientId(),
    redirect_uri: getRedirectUri(),
    code,
    code_verifier: verifier,
  });

  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getEtsyClientId(),
    refresh_token: refreshToken,
  });

  const res = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Etsy token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function saveTokens(tokens: TokenResponse): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured");
  }
  const supabase = getSupabaseAdmin();
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  const { error } = await supabase.from("etsy_oauth_tokens").upsert({
    id: 1,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to save Etsy tokens: ${error.message}`);
}

async function refreshAndPersist(refreshToken: string): Promise<string> {
  const tokens = await refreshAccessToken(refreshToken);
  await saveTokens(tokens);
  return tokens.access_token;
}

export async function getValidAccessToken(): Promise<string> {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured");
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("etsy_oauth_tokens")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load Etsy tokens: ${error.message}`);

  let refreshToken = data?.refresh_token as string | undefined;
  const accessToken = data?.access_token as string | undefined;
  const expiresAt = data?.expires_at ? new Date(data.expires_at) : null;

  if (!refreshToken && process.env.ETSY_REFRESH_TOKEN) {
    refreshToken = process.env.ETSY_REFRESH_TOKEN;
  }

  if (!refreshToken) {
    throw new Error(
      "No Etsy OAuth token. Connect via /api/etsy/auth first."
    );
  }

  const needsRefresh =
    !accessToken ||
    !expiresAt ||
    expiresAt.getTime() < Date.now() + 60_000;

  if (!needsRefresh && accessToken) {
    return accessToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAndPersist(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export type EtsyListing = {
  listing_id: number;
  title: string;
  tags?: string[];
  description?: string;
  views?: number;
  num_favorers?: number;
  shop_id?: number;
  taxonomy_id?: number;
  taxonomy_path?: string[];
  price?: { amount: number; divisor: number; currency_code: string };
  state?: string;
  url?: string;
  original_creation_timestamp?: number;
};

export type MarketplaceListing = {
  listing_id: number;
  shop_id: number | null;
  title: string;
  tags: string[];
  description: string;
  views: number;
  num_favorers: number;
  price_amount: number | null;
  price_currency: string | null;
  url: string | null;
  taxonomy_path: string | null;
  original_creation_timestamp?: number | null;
};

export type SearchActiveListingsParams = {
  keywords: string;
  taxonomyId?: number | null;
  limit?: number;
  sortOn?: "score" | "created" | "price" | "updated";
};

export function etsyListingPrice(listing: EtsyListing): {
  amount: number | null;
  currency: string | null;
} {
  const amount =
    listing.price && listing.price.divisor
      ? listing.price.amount / listing.price.divisor
      : null;
  return {
    amount,
    currency: listing.price?.currency_code || null,
  };
}

/** Public marketplace search (API key only — no OAuth). */
export async function searchActiveListings(
  params: SearchActiveListingsParams
): Promise<EtsyListing[]> {
  const keywords = params.keywords.trim();
  if (!keywords) return [];

  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  const url = new URL(`${ETSY_API_BASE}/application/listings/active`);
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  url.searchParams.set("sort_on", params.sortOn || "score");
  url.searchParams.set("sort_order", "desc");
  if (params.taxonomyId != null && params.taxonomyId > 0) {
    url.searchParams.set("taxonomy_id", String(params.taxonomyId));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": getEtsyApiKeyHeader(),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Etsy marketplace search failed: ${res.status} ${text.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as {
    count?: number;
    results?: EtsyListing[];
  };
  return json.results || [];
}

export function mapEtsyListingToMarketplace(
  listing: EtsyListing
): MarketplaceListing {
  const { amount, currency } = etsyListingPrice(listing);

  return {
    listing_id: listing.listing_id,
    shop_id: listing.shop_id ?? null,
    title: listing.title || "",
    tags: listing.tags || [],
    description: listing.description || "",
    views: listing.views ?? 0,
    num_favorers: listing.num_favorers ?? 0,
    price_amount: amount,
    price_currency: currency,
    url: listing.url || null,
    taxonomy_path: listing.taxonomy_path?.join(" > ") || null,
    original_creation_timestamp: listing.original_creation_timestamp ?? null,
  };
}

/**
 * Public getListing (API key only — no OAuth).
 * Views are tabulated once daily for active listings and are often 0;
 * prefer num_favorers for engagement comparisons.
 */
export async function fetchListingById(
  listingId: number
): Promise<MarketplaceListing> {
  if (!Number.isFinite(listingId) || listingId <= 0) {
    throw new Error("Invalid Etsy listing id");
  }

  const url = `${ETSY_API_BASE}/application/listings/${listingId}`;
  const res = await fetch(url, {
    headers: {
      "x-api-key": getEtsyApiKeyHeader(),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (res.status === 404) {
    throw new Error(`Etsy listing ${listingId} was not found`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Etsy getListing failed: ${res.status} ${text.slice(0, 200)}`
    );
  }

  const listing = (await res.json()) as EtsyListing;
  return mapEtsyListingToMarketplace(listing);
}

/** Extract a listing id from an Etsy URL or a bare numeric string. */
export function parseEtsyListingId(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const fromUrl = raw.match(/\/listing\/(\d+)/i);
  if (fromUrl) {
    const id = Number(fromUrl[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  return null;
}

/** Re-rank score-sorted results by niche token match + public engagement. */
export function rankMarketplaceListings(
  listings: MarketplaceListing[],
  limit = 8,
  subject = ""
): MarketplaceListing[] {
  const subjectTokens = tokenizeSubject(subject);

  return [...listings]
    .map((listing) => {
      const { score } = scoreAgainstSubject(listing, subjectTokens, {
        digitalPenalty: true,
      });
      return { listing, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.listing);
}

function productKeywordFallback(productType: string): string {
  const p = productType.trim().toLowerCase();
  if (p === "t-shirt") return "shirt";
  if (p.includes("hoodie") || p.includes("sweat")) return "hoodie";
  return p.split(/\s+/)[0] || "gift";
}

/**
 * Fetch top marketplace comps for a niche subject + product.
 * Tries subject+product, then subject+short product, then subject alone.
 * Soft callers should catch errors; this returns [] when nothing matches.
 */
export async function fetchMarketplaceComps(
  subject: string,
  productType: string,
  taxonomyId: number,
  limit = 8
): Promise<MarketplaceListing[]> {
  const subjectClean = subject.trim();
  if (!subjectClean) return [];

  const productClean = productType.trim();
  const shortProduct = productKeywordFallback(productClean);
  const queries: { keywords: string; taxonomyId?: number | null }[] = [
    { keywords: `${subjectClean} ${productClean}`, taxonomyId },
    { keywords: `${subjectClean} ${productClean}`, taxonomyId: null },
    { keywords: `${subjectClean} ${shortProduct}`, taxonomyId: null },
    { keywords: subjectClean, taxonomyId: null },
  ];

  const seen = new Set<string>();
  for (const q of queries) {
    const key = `${q.keywords}|${q.taxonomyId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const raw = await searchActiveListings({
      keywords: q.keywords,
      taxonomyId: q.taxonomyId,
      limit: 25,
      sortOn: "score",
    });
    if (!raw.length) continue;

    const mapped = raw.map(mapEtsyListingToMarketplace);
    const ranked = rankMarketplaceListings(mapped, limit, subjectClean);
    if (ranked.length) return ranked;
  }

  return [];
}

async function fetchListingsByState(
  shopId: string,
  accessToken: string,
  state: string
): Promise<EtsyListing[]> {
  const results: EtsyListing[] = [];
  let offset = 0;
  const limit = 100;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(
      `${ETSY_API_BASE}/application/shops/${shopId}/listings`
    );
    url.searchParams.set("state", state);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("includes", "Images");

    const res = await fetch(url.toString(), {
      headers: {
        "x-api-key": getEtsyApiKeyHeader(),
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Etsy listings fetch failed (${state}): ${res.status} ${text.slice(0, 200)}`
      );
    }

    const json = (await res.json()) as {
      count: number;
      results: EtsyListing[];
    };
    results.push(...(json.results || []));

    if (!json.results?.length || results.length >= json.count) break;
    offset += limit;
  }

  return results;
}

export async function fetchAllShopListings(): Promise<EtsyListing[]> {
  const shopId = process.env.ETSY_SHOP_ID;
  if (!shopId) throw new Error("ETSY_SHOP_ID is not set");

  const accessToken = await getValidAccessToken();
  return fetchListingsByState(shopId, accessToken, "active");
}

export function mapEtsyListingToRow(listing: EtsyListing) {
  const { amount, currency } = etsyListingPrice(listing);

  return {
    etsy_listing_id: listing.listing_id,
    title: listing.title || "",
    tags: listing.tags || [],
    description: listing.description || "",
    views: listing.views ?? 0,
    num_favorers: listing.num_favorers ?? 0,
    taxonomy_path: listing.taxonomy_path?.join(" > ") || null,
    category: listing.taxonomy_path?.[listing.taxonomy_path.length - 1] || null,
    price_amount: amount,
    price_currency: currency,
    state: listing.state || "active",
    url: listing.url || null,
    raw: listing,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
