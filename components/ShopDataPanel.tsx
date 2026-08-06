"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { KeywordStat, ShopListing } from "@/lib/types";
import { ErrorBanner, SuccessBanner } from "./ui";

type ShopDataResponse = {
  listings: ShopListing[];
  keywords: { tags: KeywordStat[]; titlePhrases: KeywordStat[] };
  etsyConnected: boolean;
  tokenUpdatedAt?: string | null;
  warning?: string;
  error?: string;
};

export function ShopDataPanel() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ShopDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop-data", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const etsy = searchParams.get("etsy");
    if (etsy === "connected") setMessage("Etsy connected successfully.");
    if (etsy === "error") {
      setError(searchParams.get("message") || "Etsy OAuth failed");
    }
  }, [searchParams]);

  async function syncNow() {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/sync-listings", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync failed");
      setMessage(
        `Synced ${json.synced} active listings${
          json.removed ? ` · removed ${json.removed} inactive/stale` : ""
        }.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Shop data</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Synced MotorElement listings and keyword performance signals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/etsy/auth"
            className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Connect Etsy
          </a>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      {data && (
        <p className="font-mono text-xs text-zinc-500">
          Etsy OAuth: {data.etsyConnected ? "connected" : "not connected"}
          {data.tokenUpdatedAt
            ? ` · token updated ${new Date(data.tokenUpdatedAt).toLocaleString()}`
            : ""}
          {" · "}
          {data.listings.length} listings loaded
        </p>
      )}

      {message && <SuccessBanner message={message} />}
      {error && <ErrorBanner message={error} />}
      {data?.warning && (
        <p className="text-sm text-amber-400">{data.warning}</p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-2">
            <KeywordTable
              title="Top tags by performance"
              rows={data?.keywords.tags || []}
            />
            <KeywordTable
              title="Top title phrases"
              rows={data?.keywords.titlePhrases || []}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Listings
            </h2>
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">Views</th>
                    <th className="px-3 py-2">Favs</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.listings || []).map((l) => (
                    <tr
                      key={l.id}
                      className="border-t border-zinc-800/80 text-zinc-300"
                    >
                      <td className="max-w-xs truncate px-3 py-2 font-mono text-xs">
                        {l.url ? (
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-amber-400"
                          >
                            {l.title}
                          </a>
                        ) : (
                          l.title
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{l.state}</td>
                      <td className="px-3 py-2 font-mono text-xs">{l.views}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {l.num_favorers}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {l.price_amount != null
                          ? `${l.price_amount} ${l.price_currency || ""}`
                          : "—"}
                      </td>
                      <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-zinc-500">
                        {(l.tags || []).slice(0, 5).join(", ")}
                      </td>
                    </tr>
                  ))}
                  {!data?.listings?.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-8 text-center text-zinc-600"
                      >
                        No listings yet. Connect Etsy and sync.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KeywordTable({ title, rows }: { title: string; rows: KeywordStat[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Term</th>
              <th className="px-3 py-2 text-right">n</th>
              <th className="px-3 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map((r) => (
              <tr key={r.term} className="border-t border-zinc-800/80">
                <td className="px-3 py-1.5 font-mono text-xs text-zinc-300">
                  {r.term}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-xs text-zinc-500">
                  {r.count}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-xs text-zinc-400">
                  {r.score}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-xs text-zinc-600"
                >
                  No data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
