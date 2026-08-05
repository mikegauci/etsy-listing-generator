"use client";

import { useEffect, useState } from "react";
import type { GeneratedListingRow } from "@/lib/types";
import { CopyField } from "./CopyField";
import { formatTagsLine } from "@/lib/tags";

export function HistoryPanel() {
  const [listings, setListings] = useState<GeneratedListingRow[]>([]);
  const [selected, setSelected] = useState<GeneratedListingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/history");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setListings(json.listings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">History</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Past AI-generated listings stored in Supabase.
        </p>
      </div>

      {error && (
        <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded border border-zinc-800">
            <ul className="divide-y divide-zinc-800">
              {listings.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full px-3 py-3 text-left hover:bg-zinc-900/60 ${
                      selected?.id === item.id ? "bg-zinc-900" : ""
                    }`}
                  >
                    <p className="truncate font-mono text-sm text-zinc-200">
                      {item.title}
                    </p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {item.subject} · {item.product_type}
                      {item.is_mock ? " · MOCK" : ""} ·{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
              {!listings.length && (
                <li className="px-3 py-8 text-center text-sm text-zinc-600">
                  No generated listings yet.
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-4">
            {!selected ? (
              <div className="rounded border border-dashed border-zinc-800 px-4 py-16 text-center text-sm text-zinc-600">
                Select a listing to preview and copy.
              </div>
            ) : (
              <>
                <CopyField label="Title" value={selected.title} />
                {selected.price != null && (
                  <CopyField
                    label="Price (input)"
                    value={`$${Number(selected.price).toFixed(2)} USD`}
                  />
                )}
                {selected.options_notes && (
                  <CopyField
                    label="Options notes"
                    value={selected.options_notes}
                    multiline
                    rows={3}
                  />
                )}
                <CopyField
                  label="Tags"
                  value={formatTagsLine(selected.tags)}
                  copyValue={formatTagsLine(selected.tags)}
                  singleLine
                  hint="One comma-separated line — use Copy to paste into Etsy."
                />
                <CopyField
                  label="Description"
                  value={selected.description}
                  multiline
                  rows={12}
                />
                <CopyField label="Alt text" value={selected.alt_text} />
                <CopyField
                  label="SEO notes"
                  value={selected.seo_notes}
                  multiline
                  rows={3}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
