import type { ShopConfig, ShopId } from "./types";
import { normalizeShopId } from "./types";
import { motorElementShop } from "./motor-element";
import { littleAndLoomShop } from "./little-and-loom/config";

export const DEFAULT_SHOP_ID: ShopId = "motor-element";

export const SHOPS: Record<ShopId, ShopConfig> = {
  "motor-element": motorElementShop,
  "little-and-loom": littleAndLoomShop,
};

export const SHOP_LIST = Object.values(SHOPS);

export function getShop(shopId?: string | null): ShopConfig {
  return SHOPS[normalizeShopId(shopId)];
}

export function isValidShopId(value: string): value is ShopId {
  return value === "motor-element" || value === "little-and-loom";
}

export { normalizeShopId };
export type { ShopConfig, ShopId, MockupColor, MockupBase, MockupConfig } from "./types";
