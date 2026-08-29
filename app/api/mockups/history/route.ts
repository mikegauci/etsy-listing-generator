import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { apiError } from "@/lib/api";
import { getShop, normalizeShopId } from "@/lib/shops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ runs: [], warning: "Supabase is not configured" });
    }

    const url = new URL(request.url);
    const shopId = normalizeShopId(url.searchParams.get("shopId"));
    const shop = getShop(shopId);
    const limit = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("limit") || 20))
    );

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_mockups")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(limit * 12);

    if (error) {
      return apiError(500, "Failed to load mockup history", error);
    }

    const byRun = new Map<
      string,
      {
        runId: string;
        shopId: string;
        createdAt: string;
        artworkName: string | null;
        personalizationName: string | null;
        resolution: string | null;
        aspectRatio: string | null;
        outputFormat: string | null;
        items: typeof data;
      }
    >();

    for (const row of data || []) {
      const existing = byRun.get(row.run_id);
      if (!existing) {
        byRun.set(row.run_id, {
          runId: row.run_id,
          shopId: row.shop_id,
          createdAt: row.created_at,
          artworkName: row.artwork_name,
          personalizationName: row.personalization_name,
          resolution: row.resolution,
          aspectRatio: row.aspect_ratio,
          outputFormat: row.output_format,
          items: [row],
        });
      } else {
        existing.items.push(row);
      }
    }

    const runs = Array.from(byRun.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);

    return NextResponse.json({ runs, shopId: shop.id });
  } catch (err) {
    return apiError(500, "Failed to load mockup history", err);
  }
}
