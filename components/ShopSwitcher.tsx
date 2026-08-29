"use client";

import { SHOP_LIST, type ShopId } from "@/lib/shops";
import { readShopIdFromCookie, writeShopIdCookie } from "@/lib/shop-cookie";
import { useEffect, useState } from "react";

export function ShopSwitcher() {
  const [shopId, setShopId] = useState<ShopId>("motor-element");

  useEffect(() => {
    const fromCookie = readShopIdFromCookie();
    if (fromCookie === "little-and-loom" || fromCookie === "motor-element") {
      setShopId(fromCookie);
    }
  }, []);

  function onChange(next: ShopId) {
    setShopId(next);
    writeShopIdCookie(next);
    window.dispatchEvent(new CustomEvent("shop-changed", { detail: next }));
  }

  return (
    <select
      aria-label="Active shop"
      value={shopId}
      onChange={(e) => onChange(e.target.value as ShopId)}
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
    >
      {SHOP_LIST.map((shop) => (
        <option key={shop.id} value={shop.id}>
          {shop.navLabel}
        </option>
      ))}
    </select>
  );
}

export function useActiveShopId(): ShopId {
  const [shopId, setShopId] = useState<ShopId>("motor-element");

  useEffect(() => {
    const sync = () => {
      const fromCookie = readShopIdFromCookie();
      if (fromCookie === "little-and-loom" || fromCookie === "motor-element") {
        setShopId(fromCookie);
      }
    };
    sync();
    window.addEventListener("shop-changed", sync);
    return () => window.removeEventListener("shop-changed", sync);
  }, []);

  return shopId;
}
