import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { normalizeChecklistCategoryIds } from "@/lib/title-checklist";
import { apiError } from "@/lib/api";
import { getShop, normalizeShopId } from "@/lib/shops";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  shopId: z.string().optional(),
  doneCategories: z.array(z.string().min(1).max(100)).max(100),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const shopId = normalizeShopId(url.searchParams.get("shopId"));
    const shop = getShop(shopId);
    const validIds = new Set(shop.checklistCategories.map((c) => c.id));

    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        shopId: shop.id,
        doneCategories: [],
        warning: "Supabase is not configured",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("title_checklist")
      .select("done_categories, updated_at")
      .eq("shop_id", shop.id)
      .maybeSingle();

    if (error) {
      return apiError(500, "Failed to load title checklist", error);
    }

    const raw = Array.isArray(data?.done_categories)
      ? data.done_categories.filter(
          (id: unknown): id is string => typeof id === "string"
        )
      : [];

    const doneCategories = normalizeChecklistCategoryIds(raw).filter((id) =>
      validIds.has(id)
    );

    return NextResponse.json({
      shopId: shop.id,
      doneCategories,
      updatedAt: data?.updated_at ?? null,
    });
  } catch (err) {
    return apiError(500, "Failed to load title checklist", err);
  }
}

export async function PUT(request: Request) {
  try {
    if (!hasSupabaseConfig()) {
      return apiError(503, "Supabase is not configured");
    }

    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checklist payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const shop = getShop(parsed.data.shopId);
    const validIds = new Set(shop.checklistCategories.map((c) => c.id));
    const doneCategories = normalizeChecklistCategoryIds(
      parsed.data.doneCategories
    ).filter((id) => validIds.has(id));

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("title_checklist")
      .upsert(
        {
          shop_id: shop.id,
          done_categories: doneCategories,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "shop_id" }
      )
      .select("done_categories, updated_at")
      .single();

    if (error) {
      return apiError(500, "Failed to save title checklist", error);
    }

    return NextResponse.json({
      shopId: shop.id,
      doneCategories: normalizeChecklistCategoryIds(
        Array.isArray(data.done_categories) ? data.done_categories : []
      ).filter((id) => validIds.has(id)),
      updatedAt: data.updated_at ?? null,
    });
  } catch (err) {
    return apiError(500, "Failed to save title checklist", err);
  }
}
