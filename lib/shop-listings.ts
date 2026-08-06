/** Shared select list for shop_listings rows used across routes + ranking. */
export const SHOP_LISTING_COLUMNS =
  "id, etsy_listing_id, title, tags, description, views, num_favorers, taxonomy_path, category, price_amount, price_currency, state, url, synced_at";

export function formatReferencedListing(row: {
  etsy_listing_id: number;
  title: string;
  price_amount?: number | null;
  price_currency?: string | null;
}): string {
  const price =
    row.price_amount != null
      ? ` (${row.price_amount} ${row.price_currency || "USD"})`
      : "";
  return `${row.etsy_listing_id}: ${row.title}${price}`;
}

export function resolveMediaContext(input: {
  mediaFiles?: { name: string; kind: string }[] | null;
  imageName?: string | null;
}): string {
  if (input.mediaFiles?.length) {
    return input.mediaFiles.map((m) => `${m.kind}: ${m.name}`).join("; ");
  }
  if (input.imageName) return `image: ${input.imageName}`;
  return "none";
}
