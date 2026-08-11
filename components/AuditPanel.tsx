"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Finding,
  ListingAuditResult,
  ShopAuditResult,
} from "@/lib/audit";
import { ErrorBanner } from "./ui";

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function severityClass(severity: Finding["severity"]): string {
  if (severity === "high") return "text-red-300";
  if (severity === "medium") return "text-amber-300";
  return "text-zinc-400";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export function AuditPanel() {
  const [data, setData] = useState<ShopAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load audit");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCopy(id: string, text: string) {
    await copyText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Listing audit</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Health scores from your SEO rules, plus tag cannibalization across the
            shop.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading && !data ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Listings scored"
              value={String(data.summary.listingCount)}
            />
            <StatCard
              label="Average score"
              value={String(data.summary.averageScore)}
              valueClass={scoreColor(data.summary.averageScore)}
            />
            <StatCard
              label="High-severity findings"
              value={String(data.summary.highFindingCount)}
              valueClass={
                data.summary.highFindingCount > 0
                  ? "text-red-400"
                  : "text-emerald-400"
              }
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Tag cannibalization
            </h2>
            <p className="text-sm text-zinc-500">
              Differentiation = tags unique to that listing. With 10 evergreen tags
              shared shop-wide, expect low unique counts unless niche tags differ.
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="overflow-hidden rounded border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Listing</th>
                      <th className="px-3 py-2 text-right">Unique tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cannibalization.differentiation.map((d) => (
                      <tr
                        key={d.etsy_listing_id}
                        className="border-t border-zinc-800/80"
                      >
                        <td className="max-w-xs truncate px-3 py-1.5 font-mono text-xs text-zinc-300">
                          {d.title}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-mono text-xs ${
                            d.uniqueTagCount <= 1
                              ? "text-red-400"
                              : d.uniqueTagCount <= 3
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {d.uniqueTagCount}
                        </td>
                      </tr>
                    ))}
                    {!data.cannibalization.differentiation.length && (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-3 py-6 text-center text-xs text-zinc-600"
                        >
                          No listings synced yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Tag</th>
                      <th className="px-3 py-2 text-right">Listings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cannibalization.tagCoverage.slice(0, 20).map((t) => (
                      <tr key={t.tag} className="border-t border-zinc-800/80">
                        <td className="px-3 py-1.5 font-mono text-xs text-zinc-300">
                          {t.tag}
                          {t.isEvergreen && (
                            <span className="ml-2 text-[10px] uppercase text-zinc-600">
                              evergreen
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs text-zinc-400">
                          {t.listingCount}
                        </td>
                      </tr>
                    ))}
                    {!data.cannibalization.tagCoverage.length && (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-3 py-6 text-center text-xs text-zinc-600"
                        >
                          No tags yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {data.cannibalization.pairwise.length > 0 && (
              <div className="overflow-x-auto rounded border border-zinc-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Pair (worst overlap first)</th>
                      <th className="px-3 py-2">Jaccard</th>
                      <th className="px-3 py-2">Shared tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cannibalization.pairwise.slice(0, 10).map((p) => (
                      <tr
                        key={`${p.aId}-${p.bId}`}
                        className="border-t border-zinc-800/80 text-zinc-300"
                      >
                        <td className="max-w-md truncate px-3 py-2 font-mono text-xs">
                          {p.aTitle}{" "}
                          <span className="text-zinc-600">×</span> {p.bTitle}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-amber-400">
                          {(p.jaccard * 100).toFixed(0)}%
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-zinc-500">
                          {p.sharedTags.slice(0, 8).join(", ")}
                          {p.sharedTags.length > 8 ? "…" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.cannibalization.titlePhraseOverlap.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Title phrases on &gt;50% of listings
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.cannibalization.titlePhraseOverlap.map((p) => (
                    <span
                      key={p.term}
                      className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-300"
                    >
                      {p.term}{" "}
                      <span className="text-zinc-600">
                        ({p.count}/{data.summary.listingCount})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Listings by score (worst first)
            </h2>
            <div className="space-y-2">
              {data.perListing.map((row) => (
                <AuditRow
                  key={row.listing.id}
                  row={row}
                  expanded={Boolean(expanded[row.listing.id])}
                  onToggle={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [row.listing.id]: !prev[row.listing.id],
                    }))
                  }
                  onCopy={onCopy}
                  copiedId={copiedId}
                />
              ))}
              {!data.perListing.length && (
                <p className="rounded border border-zinc-800 px-3 py-8 text-center text-sm text-zinc-600">
                  No listings yet. Connect Etsy and sync from Shop data.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass = "text-zinc-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${valueClass}`}>{value}</p>
    </div>
  );
}

function AuditRow({
  row,
  expanded,
  onToggle,
  onCopy,
  copiedId,
}: {
  row: ListingAuditResult;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (id: string, text: string) => void;
  copiedId: string | null;
}) {
  const high = row.findings.filter((f) => f.severity === "high").length;
  const medium = row.findings.filter((f) => f.severity === "medium").length;
  const low = row.findings.filter((f) => f.severity === "low").length;
  const copyKey = `title-${row.listing.id}`;

  return (
    <div className="rounded border border-zinc-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-900/50"
      >
        <span
          className={`w-10 font-mono text-sm font-semibold ${scoreColor(row.score)}`}
        >
          {row.score}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-200">
          {row.listing.title}
        </span>
        <span className="font-mono text-[11px] text-zinc-500">
          unique tags: {row.differentiationCount} · H{high}/M{medium}/L{low}
        </span>
        <span className="text-xs text-zinc-600">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
          <div className="flex flex-wrap gap-4 font-mono text-xs text-zinc-500">
            <span>Views {row.listing.views}</span>
            <span>Favs {row.listing.num_favorers}</span>
            <span>
              {row.listing.price_amount != null
                ? `$${row.listing.price_amount}`
                : "No price"}
            </span>
            {row.listing.url && (
              <a
                href={row.listing.url}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline"
              >
                Open on Etsy
              </a>
            )}
          </div>

          {row.suggestedTitle && (
            <div className="rounded border border-amber-900/40 bg-amber-950/20 px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-amber-500">
                  Suggested title
                </p>
                <button
                  type="button"
                  onClick={() => onCopy(copyKey, row.suggestedTitle!)}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-500"
                >
                  {copiedId === copyKey ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="font-mono text-xs text-zinc-200">
                {row.suggestedTitle}
              </p>
            </div>
          )}

          {row.findings.length ? (
            <ul className="space-y-2">
              {(["high", "medium", "low"] as const).map((sev) => {
                const group = row.findings.filter((f) => f.severity === sev);
                if (!group.length) return null;
                return (
                  <li key={sev} className="space-y-1">
                    <p
                      className={`text-[11px] font-medium uppercase tracking-wide ${severityClass(sev)}`}
                    >
                      {sev}
                    </p>
                    {group.map((f) => (
                      <div
                        key={f.id}
                        className="rounded border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-1.5"
                      >
                        <p className="text-sm text-zinc-300">{f.message}</p>
                        {f.suggestion && f.id !== "title-rules-drift" && (
                          <p className="mt-0.5 font-mono text-xs text-zinc-500">
                            → {f.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-emerald-400">No findings — looks solid.</p>
          )}
        </div>
      )}
    </div>
  );
}
