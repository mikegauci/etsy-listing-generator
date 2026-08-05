import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      doneCategories: data?.done_categories ?? [],
      updatedAt: data?.updated_at ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load title checklist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const doneCategories = [...new Set(parsed.data.doneCategories)];
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      doneCategories: data.done_categories ?? [],
      updatedAt: data.updated_at ?? null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save title checklist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
