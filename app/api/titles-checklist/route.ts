import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { ALL_CHECKLIST_CATEGORIES } from "@/lib/title-checklist";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const validCategoryIds = new Set(ALL_CHECKLIST_CATEGORIES.map((c) => c.id));

const putSchema = z.object({
  doneCategories: z.array(z.string().min(1).max(100)).max(100),
});

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        doneCategories: [],
        warning: "Supabase is not configured",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("title_checklist")
      .select("done_categories, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return apiError(500, "Failed to load title checklist", error);
    }

    const done = Array.isArray(data?.done_categories)
      ? data.done_categories.filter(
          (id: unknown): id is string =>
            typeof id === "string" && validCategoryIds.has(id)
        )
      : [];

    return NextResponse.json({
      doneCategories: done,
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

    const doneCategories = Array.from(
      new Set(
        parsed.data.doneCategories.filter((id) => validCategoryIds.has(id))
      )
    );
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("title_checklist")
      .upsert(
        {
          id: 1,
          done_categories: doneCategories,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("done_categories, updated_at")
      .single();

    if (error) {
      return apiError(500, "Failed to save title checklist", error);
    }

    return NextResponse.json({
      doneCategories: data.done_categories ?? [],
      updatedAt: data.updated_at ?? null,
    });
  } catch (err) {
    return apiError(500, "Failed to save title checklist", err);
  }
}
