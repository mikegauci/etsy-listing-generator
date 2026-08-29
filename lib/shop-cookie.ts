export const SHOP_COOKIE = "shop_id";

export function readShopIdFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SHOP_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] || "");
}

export function writeShopIdCookie(shopId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SHOP_COOKIE}=${encodeURIComponent(shopId)}; path=/; max-age=31536000; samesite=lax`;
}
