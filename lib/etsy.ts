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
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  const isUrlEncoded =
    typeof URLSearchParams !== "undefined" &&
    init.body instanceof URLSearchParams;
  if (init.body && !headers.has("Content-Type") && !isFormData) {
    headers.set(
      "Content-Type",
      isUrlEncoded
        ? "application/x-www-form-urlencoded"
        : "application/json"
    );
  }
  return fetch(`${ETSY_API_BASE}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(60_000),
  });
}

function getShopId(): string {
  const shopId = process.env.ETSY_SHOP_ID;
  if (!shopId) throw new Error("ETSY_SHOP_ID is not set");
  return shopId;
}

async function etsyJson<T>(
  path: string,
  init: RequestInit = {},
  errorLabel: string
): Promise<T> {
  const res = await etsyFetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${errorLabel}: ${res.status} ${text.slice(0, 400)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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

export function getRedirectUri(requestOrigin?: string | null): string {
  const origin = normalizeOrigin(requestOrigin);
  if (origin && isAllowedOAuthOrigin(origin)) {
    return `${origin}/api/etsy/callback`;
  }

  const explicit = process.env.ETSY_REDIRECT_URI;
  if (explicit) return explicit.replace(/\/$/, "");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("ETSY_REDIRECT_URI or NEXT_PUBLIC_APP_URL must be set");
  }
  return `${appUrl.replace(/\/$/, "")}/api/etsy/callback`;
}

function normalizeOrigin(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isAllowedOAuthOrigin(origin: string): boolean {
  if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;

  const configured = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.ETSY_REDIRECT_URI,
  ]
    .map((v) => normalizeOrigin(v))
    .filter(Boolean) as string[];

  return configured.includes(origin);
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthUrl(
  state: string,
  challenge: string,
  redirectUri?: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getEtsyClientId(),
    redirect_uri: redirectUri || getRedirectUri(),
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
  verifier: string,
  redirectUri?: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getEtsyClientId(),
    redirect_uri: redirectUri || getRedirectUri(),
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

export type EtsyMoney = {
  amount: number;
  divisor: number;
  currency_code: string;
};

export type EtsyListingImage = {
  listing_id?: number;
  listing_image_id: number;
  rank?: number;
  url_75x75?: string;
  url_170x135?: string;
  url_570xN?: string;
  url_fullxfull?: string;
  alt_text?: string | null;
};

export type EtsyListingVideo = {
  video_id: number;
  height?: number;
  width?: number;
  thumbnail_url?: string;
  video_url?: string;
  video_state?: string;
};

export type EtsyListingPropertyValue = {
  property_id: number;
  property_name?: string | null;
  scale_id?: number | null;
  value_ids: number[];
  values: string[];
};

export type EtsyListingOffering = {
  offering_id?: number;
  quantity: number;
  is_enabled: boolean;
  is_deleted?: boolean;
  price: EtsyMoney | number;
  readiness_state_id?: number | null;
};

export type EtsyListingProduct = {
  product_id?: number;
  sku?: string | null;
  is_deleted?: boolean;
  property_values?: EtsyListingPropertyValue[];
  offerings: EtsyListingOffering[];
};

export type EtsyListingInventory = {
  products: EtsyListingProduct[];
  price_on_property?: number[];
  quantity_on_property?: number[];
  sku_on_property?: number[];
  readiness_state_on_property?: number[] | null;
};

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
  price?: EtsyMoney;
  quantity?: number;
  state?: string;
  url?: string;
  original_creation_timestamp?: number;
  who_made?: string;
  when_made?: string;
  is_supply?: boolean;
  listing_type?: string;
  type?: string;
  shipping_profile_id?: number | null;
  return_policy_id?: number | null;
  shop_section_id?: number | null;
  readiness_state_id?: number | null;
  processing_min?: number | null;
  processing_max?: number | null;
  materials?: string[] | null;
  styles?: string[] | null;
  item_weight?: number | null;
  item_length?: number | null;
  item_width?: number | null;
  item_height?: number | null;
  item_weight_unit?: string | null;
  item_dimensions_unit?: string | null;
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_char_count_max?: number | null;
  personalization_instructions?: string | null;
  is_customizable?: boolean;
  should_auto_renew?: boolean;
  is_taxable?: boolean;
  production_partners?: { production_partner_id: number }[];
  images?: EtsyListingImage[];
  videos?: EtsyListingVideo[];
  inventory?: EtsyListingInventory;
};

export type CreateDraftListingInput = {
  quantity: number;
  title: string;
  description: string;
  price: number;
  who_made: string;
  when_made: string;
  taxonomy_id: number;
  shipping_profile_id?: number | null;
  return_policy_id?: number | null;
  materials?: string[] | null;
  shop_section_id?: number | null;
  processing_min?: number | null;
  processing_max?: number | null;
  readiness_state_id?: number | null;
  tags?: string[];
  styles?: string[] | null;
  item_weight?: number | null;
  item_length?: number | null;
  item_width?: number | null;
  item_height?: number | null;
  item_weight_unit?: string | null;
  item_dimensions_unit?: string | null;
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_char_count_max?: number | null;
  personalization_instructions?: string | null;
  production_partner_ids?: number[] | null;
  is_supply?: boolean;
  is_customizable?: boolean;
  should_auto_renew?: boolean;
  is_taxable?: boolean;
  type?: string;
};

export type UploadListingImageInput = {
  listingId: number;
  listingImageId?: number;
  image?: Blob;
  fileName?: string;
  rank: number;
  altText?: string;
};

export type UploadListingVideoInput = {
  listingId: number;
  videoId?: number;
  video?: Blob;
  fileName?: string;
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

export function featuredImageUrlFromListing(
  listing: EtsyListing
): string | null {
  const images = [...(listing.images || [])].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
  );
  const featured = images[0];
  if (!featured) return null;
  return (
    featured.url_170x135 ||
    featured.url_75x75 ||
    featured.url_570xN ||
    featured.url_fullxfull ||
    null
  );
}

export async function fetchActiveListingFeaturedImages(): Promise<
  Map<number, string>
> {
  const listings = await fetchAllShopListings();
  const map = new Map<number, string>();
  for (const listing of listings) {
    const url = featuredImageUrlFromListing(listing);
    if (url) map.set(listing.listing_id, url);
  }
  return map;
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

function appendFormValue(
  body: URLSearchParams,
  key: string,
  value: string | number | boolean | null | undefined
) {
  if (value === null || value === undefined) return;
  if (typeof value === "boolean") {
    body.append(key, value ? "true" : "false");
    return;
  }
  body.append(key, String(value));
}

function appendFormArray(
  body: URLSearchParams,
  key: string,
  values: Array<string | number> | null | undefined
) {
  if (!values?.length) return;
  for (const value of values) {
    body.append(key, String(value));
  }
}

export async function fetchShopListingDetail(
  listingId: number
): Promise<EtsyListing> {
  if (!Number.isFinite(listingId) || listingId <= 0) {
    throw new Error("Invalid Etsy listing id");
  }

  const params = new URLSearchParams();
  params.append("includes", "Images");
  params.append("includes", "Videos");
  params.append("includes", "Inventory");
  params.append("includes", "Personalization");
  params.set("legacy", "true");

  const listing = await etsyJson<EtsyListing>(
    `/application/listings/${listingId}?${params.toString()}`,
    { method: "GET" },
    "Etsy getListing failed"
  );

  const shopId = Number(getShopId());
  if (listing.shop_id != null && listing.shop_id !== shopId) {
    throw new Error("Listing does not belong to this shop");
  }

  return listing;
}

export async function createDraftListing(
  input: CreateDraftListingInput
): Promise<EtsyListing> {
  const shopId = getShopId();
  const body = new URLSearchParams();

  appendFormValue(body, "quantity", input.quantity);
  appendFormValue(body, "title", input.title);
  appendFormValue(body, "description", input.description);
  appendFormValue(body, "price", input.price);
  appendFormValue(body, "who_made", input.who_made);
  appendFormValue(body, "when_made", input.when_made);
  appendFormValue(body, "taxonomy_id", input.taxonomy_id);
  appendFormValue(body, "shipping_profile_id", input.shipping_profile_id);
  appendFormValue(body, "return_policy_id", input.return_policy_id);
  appendFormArray(body, "materials", input.materials ?? undefined);
  appendFormValue(body, "shop_section_id", input.shop_section_id);
  appendFormValue(body, "processing_min", input.processing_min);
  appendFormValue(body, "processing_max", input.processing_max);
  appendFormValue(body, "readiness_state_id", input.readiness_state_id);
  appendFormArray(body, "tags", input.tags);
  appendFormArray(body, "styles", input.styles ?? undefined);
  appendFormValue(body, "item_weight", input.item_weight);
  appendFormValue(body, "item_length", input.item_length);
  appendFormValue(body, "item_width", input.item_width);
  appendFormValue(body, "item_height", input.item_height);
  appendFormValue(body, "item_weight_unit", input.item_weight_unit);
  appendFormValue(body, "item_dimensions_unit", input.item_dimensions_unit);
  appendFormValue(body, "is_personalizable", input.is_personalizable);
  appendFormValue(
    body,
    "personalization_is_required",
    input.personalization_is_required
  );
  appendFormValue(
    body,
    "personalization_char_count_max",
    input.personalization_char_count_max
  );
  appendFormValue(
    body,
    "personalization_instructions",
    input.personalization_instructions
  );
  appendFormArray(
    body,
    "production_partner_ids",
    input.production_partner_ids ?? undefined
  );
  appendFormValue(body, "is_supply", input.is_supply);
  appendFormValue(body, "is_customizable", input.is_customizable);
  appendFormValue(body, "should_auto_renew", input.should_auto_renew);
  appendFormValue(body, "is_taxable", input.is_taxable);
  appendFormValue(body, "type", input.type || "physical");

  return etsyJson<EtsyListing>(
    `/application/shops/${shopId}/listings?legacy=true`,
    { method: "POST", body },
    "Etsy createDraftListing failed"
  );
}

export async function uploadListingImage(
  input: UploadListingImageInput
): Promise<EtsyListingImage> {
  const shopId = getShopId();
  const form = new FormData();

  if (input.listingImageId != null) {
    form.append("listing_image_id", String(input.listingImageId));
  } else if (input.image) {
    form.append(
      "image",
      input.image,
      input.fileName || "listing-image.jpg"
    );
  } else {
    throw new Error("uploadListingImage requires listingImageId or image");
  }

  form.append("rank", String(input.rank));
  if (input.altText != null) {
    form.append("alt_text", input.altText.slice(0, 500));
  }

  return etsyJson<EtsyListingImage>(
    `/application/shops/${shopId}/listings/${input.listingId}/images`,
    { method: "POST", body: form },
    "Etsy uploadListingImage failed"
  );
}

export async function uploadListingVideo(
  input: UploadListingVideoInput
): Promise<EtsyListingVideo> {
  const shopId = getShopId();
  const form = new FormData();

  if (input.videoId != null) {
    form.append("video_id", String(input.videoId));
  } else if (input.video) {
    form.append("video", input.video, input.fileName || "listing-video.mp4");
    form.append("name", input.fileName || "listing-video.mp4");
  } else {
    throw new Error("uploadListingVideo requires videoId or video");
  }

  return etsyJson<EtsyListingVideo>(
    `/application/shops/${shopId}/listings/${input.listingId}/videos`,
    { method: "POST", body: form },
    "Etsy uploadListingVideo failed"
  );
}

export async function getListingInventory(
  listingId: number
): Promise<EtsyListingInventory> {
  return etsyJson<EtsyListingInventory>(
    `/application/listings/${listingId}/inventory?legacy=true`,
    { method: "GET" },
    "Etsy getListingInventory failed"
  );
}

function moneyToFloat(price: EtsyMoney | number): number {
  if (typeof price === "number") return price;
  if (!price?.divisor) return Number(price?.amount) || 0;
  return price.amount / price.divisor;
}

export function sanitizeInventoryForUpdate(
  inventory: EtsyListingInventory
): {
  products: Array<{
    sku?: string | null;
    property_values?: Array<{
      property_id: number;
      property_name?: string;
      scale_id?: number | null;
      value_ids: number[];
      values: string[];
    }>;
    offerings: Array<{
      price: number;
      quantity: number;
      is_enabled: boolean;
      readiness_state_id?: number;
    }>;
  }>;
  price_on_property?: number[];
  quantity_on_property?: number[];
  sku_on_property?: number[];
  readiness_state_on_property?: number[];
} {
  const products = (inventory.products || [])
    .filter((p) => !p.is_deleted)
    .map((product) => {
      const offerings = (product.offerings || [])
        .filter((o) => !o.is_deleted)
        .map((offering) => {
          const row: {
            price: number;
            quantity: number;
            is_enabled: boolean;
            readiness_state_id?: number;
          } = {
            price: moneyToFloat(offering.price),
            quantity: offering.quantity,
            is_enabled: offering.is_enabled,
          };
          if (
            offering.readiness_state_id != null &&
            offering.readiness_state_id > 0
          ) {
            row.readiness_state_id = offering.readiness_state_id;
          }
          return row;
        });

      return {
        sku: product.sku ?? null,
        property_values: (product.property_values || []).map((pv) => ({
          property_id: pv.property_id,
          property_name: pv.property_name || undefined,
          scale_id: pv.scale_id ?? null,
          value_ids: pv.value_ids || [],
          values: pv.values || [],
        })),
        offerings,
      };
    })
    .filter((p) => p.offerings.length > 0);

  const payload: ReturnType<typeof sanitizeInventoryForUpdate> = { products };
  if (inventory.price_on_property?.length) {
    payload.price_on_property = inventory.price_on_property;
  }
  if (inventory.quantity_on_property?.length) {
    payload.quantity_on_property = inventory.quantity_on_property;
  }
  if (inventory.sku_on_property?.length) {
    payload.sku_on_property = inventory.sku_on_property;
  }
  if (inventory.readiness_state_on_property?.length) {
    payload.readiness_state_on_property = inventory.readiness_state_on_property;
  }
  return payload;
}

export async function updateListingInventory(
  listingId: number,
  inventory: EtsyListingInventory
): Promise<EtsyListingInventory> {
  const body = sanitizeInventoryForUpdate(inventory);
  if (!body.products.length) {
    throw new Error("No inventory products to copy");
  }

  return etsyJson<EtsyListingInventory>(
    `/application/listings/${listingId}/inventory?legacy=true`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    "Etsy updateListingInventory failed"
  );
}

export function buildDraftInputFromSource(
  source: EtsyListing,
  edits: { title: string; description: string; tags: string[] }
): CreateDraftListingInput {
  const { amount } = etsyListingPrice(source);
  if (amount == null || amount <= 0) {
    throw new Error("Source listing has no valid price to copy");
  }
  if (!source.taxonomy_id) {
    throw new Error("Source listing is missing taxonomy_id");
  }
  if (!source.who_made || !source.when_made) {
    throw new Error("Source listing is missing who_made/when_made");
  }

  const listingType = source.type || source.listing_type || "physical";
  const productionPartnerIds =
    source.production_partners
      ?.map((p) => p.production_partner_id)
      .filter((id) => Number.isFinite(id) && id > 0) || null;

  return {
    quantity: Math.max(1, source.quantity ?? 1),
    title: edits.title,
    description: edits.description,
    price: amount,
    who_made: source.who_made,
    when_made: source.when_made,
    taxonomy_id: source.taxonomy_id,
    shipping_profile_id: source.shipping_profile_id ?? null,
    return_policy_id: source.return_policy_id ?? null,
    materials: source.materials ?? null,
    shop_section_id: source.shop_section_id ?? null,
    processing_min: source.processing_min ?? null,
    processing_max: source.processing_max ?? null,
    readiness_state_id: source.readiness_state_id ?? null,
    tags: edits.tags,
    styles: source.styles ?? null,
    item_weight: source.item_weight ?? null,
    item_length: source.item_length ?? null,
    item_width: source.item_width ?? null,
    item_height: source.item_height ?? null,
    item_weight_unit: source.item_weight_unit ?? null,
    item_dimensions_unit: source.item_dimensions_unit ?? null,
    is_personalizable: source.is_personalizable,
    personalization_is_required: source.personalization_is_required,
    personalization_char_count_max:
      source.personalization_char_count_max ?? null,
    personalization_instructions:
      source.personalization_instructions ?? null,
    production_partner_ids: productionPartnerIds,
    is_supply: source.is_supply ?? false,
    is_customizable: source.is_customizable,
    should_auto_renew: source.should_auto_renew,
    is_taxable: source.is_taxable,
    type: listingType,
  };
}
