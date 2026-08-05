import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ listings: [], warning: "Supabase is not configured" });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("generated_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listings: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
