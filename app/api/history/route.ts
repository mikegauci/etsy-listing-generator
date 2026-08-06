import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({
        listings: [],
        warning: "Supabase is not configured",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return apiError(500, "Failed to load history", error);
    }

    return NextResponse.json({ listings: data || [] });
  } catch (err) {
    return apiError(500, "Failed to load history", err);
  }
}
