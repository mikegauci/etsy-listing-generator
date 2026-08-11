"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { CompareResult, Recommendation } from "@/lib/compare";
import type { MarketplaceListing } from "@/lib/etsy";
import type { ShopListing } from "@/lib/types";
import { ErrorBanner, SuccessBanner, fieldClass } from "./ui";

type CompareResponse = {
  theirs: MarketplaceListing;
  mine: ShopListing;
  matchMode: "manual" | "auto";
  compare: CompareResult;
  candidates: ShopListing[];
  error?: string;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ComparePanel() {
  const [url, setUrl] = useState("");
  const [myListingId, setMyListingId] = useState<string>("");
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await fetch("/api/compare", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setListings(json.listings || []);
    } catch {
      // non-fatal — dropdown just stays empty
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  async function runCompare(e?: React.FormEvent) {
    e?.preventDefault();
    setComparing(true);
    setError(null);
    setMessage(null);
    try {
      const body: { url: string; myListingId?: number } = { url: url.trim() };
      if (myListingId) {
        body.myListingId = Number(myListingId);
      }
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Compare failed");
      setResult(json);
      if (json.candidates?.length) setListings(json.candidates);
      setMessage(
        json.matchMode === "auto"
          ? "Auto-matched your closest listing by title relevance."
          : "Compared against your selected listing."
      );
      // Keep dropdown in sync with what was used
      setMyListingId(String(json.mine.etsy_listing_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare failed");
      setResult(null);
    } finally {
      setComparing(false);
    }
  }

  async function copyFullRecommendedTags() {
    const line = result?.compare.recommendations.fullTagLine;
    if (!line) return;
    const ok = await copyText(line);
    setMessage(ok ? "Copied full recommended tag set." : "Could not copy.");
  }

  async function copyRecommendedTitle() {
    const title = result?.compare.recommendations.recommendedTitle;
    if (!title) return;
    const ok = await copyText(title);
    setMessage(ok ? "Copied recommended title." : "Could not copy.");
  }

  const recs = result?.compare.recommendations;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Competitor compare
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a competitor&apos;s Etsy listing URL and diff it against your
          closest match — tags, title keywords, structure, and engagement.
        </p>
      </div>

      <form onSubmit={runCompare} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Competitor listing URL or ID
          </label>
          <input
            className={fieldClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.etsy.com/listing/123456789/... or 123456789"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Your listing (optional override)
          </label>
          <select
            className={fieldClass}
            value={myListingId}
            onChange={(e) => setMyListingId(e.target.value)}
            disabled={loadingListings}
          >
            <option value="">
              {loadingListings
                ? "Loading your listings…"
                : "Auto-match closest listing"}
            </option>
            {listings.map((l) => (
              <option key={l.id} value={String(l.etsy_listing_id)}>
                {l.title.slice(0, 80)}
                {l.title.length > 80 ? "…" : ""} (#{l.etsy_listing_id})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={comparing || !url.trim()}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {comparing ? "Comparing…" : "Compare"}
        </button>
      </form>

      {message && <SuccessBanner message={message} />}
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-8">
          <section className="grid gap-4 md:grid-cols-2">
            <ListingCard
              label="Competitor"
              title={result.theirs.title}
              url={result.theirs.url}
              favorites={result.theirs.num_favorers}
              views={result.theirs.views}
              price={result.theirs.price_amount}
              currency={result.theirs.price_currency}
              accent="amber"
            />
            <ListingCard
              label="Yours"
              title={result.mine.title}
              url={result.mine.url}
              favorites={result.mine.num_favorers}
              views={result.mine.views}
              price={result.mine.price_amount}
              currency={result.mine.price_currency}
              accent="zinc"
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Tag gap
              </h2>
              <button
                type="button"
                onClick={copyFullRecommendedTags}
                disabled={!recs?.fullTagLine}
                className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
              >
                Copy full recommended tags
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <TagBucket
                title="They use · you don't"
                tags={result.compare.tags.theirsOnly}
                tone="amber"
              />
              <TagBucket
                title="Shared"
                tags={result.compare.tags.shared}
                tone="zinc"
              />
              <TagBucket
                title="You use · they don't"
                tags={result.compare.tags.mineOnly}
                tone="emerald"
              />
            </div>
            {recs && (
              <RecommendBox
                rec={recs.tags}
                onCopyItems={copyFullRecommendedTags}
                copyLabel="Copy full tag set"
              >
                {recs.fullTagLine && (
                  <p className="mt-2 rounded border border-zinc-800 bg-zinc-950/60 px-2.5 py-2 font-mono text-xs leading-relaxed text-zinc-200">
                    {recs.fullTagLine}
                  </p>
                )}
              </RecommendBox>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
                Title keywords
              </h2>
              <button
                type="button"
                onClick={copyRecommendedTitle}
                disabled={!recs?.recommendedTitle}
                className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
              >
                Copy recommended title
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <TagBucket
                title="They front-load"
                tags={result.compare.titleKeywords.theirsOnly}
                tone="amber"
              />
              <TagBucket
                title="Shared"
                tags={result.compare.titleKeywords.shared}
                tone="zinc"
              />
              <TagBucket
                title="You front-load"
                tags={result.compare.titleKeywords.mineOnly}
                tone="emerald"
              />
            </div>
            {recs && (
              <RecommendBox
                rec={recs.titleKeywords}
                onCopyItems={
                  recs.recommendedTitle ? copyRecommendedTitle : undefined
                }
                copyLabel="Copy title"
              >
                {recs.recommendedTitle && (
                  <div className="mt-2 rounded border border-zinc-800 bg-zinc-950/60 px-2.5 py-2">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      Recommended title
                    </p>
                    <p className="font-mono text-xs leading-relaxed text-zinc-100">
                      {recs.recommendedTitle}
                    </p>
                  </div>
                )}
              </RecommendBox>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Structure & engagement
            </h2>
            <p className="text-xs text-zinc-500">
              {result.compare.engagement.viewsNote}
            </p>
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Metric</th>
                    <th className="px-3 py-2 text-right">Yours</th>
                    <th className="px-3 py-2 text-right">Theirs</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs text-zinc-300">
                  <MetricRow
                    label="Title words"
                    mine={result.compare.structural.mine.titleWords}
                    theirs={result.compare.structural.theirs.titleWords}
                  />
                  <MetricRow
                    label="Title chars"
                    mine={result.compare.structural.mine.titleChars}
                    theirs={result.compare.structural.theirs.titleChars}
                  />
                  <MetricRow
                    label="Tag count"
                    mine={result.compare.structural.mine.tagCount}
                    theirs={result.compare.structural.theirs.tagCount}
                  />
                  <MetricRow
                    label="Tag chars used / budget"
                    mine={`${result.compare.structural.mine.tagCharsUsed}/${result.compare.structural.mine.tagCharsBudget}`}
                    theirs={`${result.compare.structural.theirs.tagCharsUsed}/${result.compare.structural.theirs.tagCharsBudget}`}
                  />
                  <MetricRow
                    label="Description chars"
                    mine={result.compare.structural.mine.descriptionChars}
                    theirs={result.compare.structural.theirs.descriptionChars}
                  />
                  <MetricRow
                    label="Price"
                    mine={
                      result.compare.structural.mine.price != null
                        ? `$${result.compare.structural.mine.price}`
                        : "—"
                    }
                    theirs={
                      result.compare.structural.theirs.price != null
                        ? `$${result.compare.structural.theirs.price}`
                        : "—"
                    }
                  />
                  <MetricRow
                    label="Favorites"
                    mine={result.compare.engagement.mineFavorites}
                    theirs={result.compare.engagement.theirsFavorites}
                  />
                  <MetricRow
                    label="Favorites / day"
                    mine={
                      result.compare.engagement.mineFavoritesPerDay ?? "—"
                    }
                    theirs={
                      result.compare.engagement.theirsFavoritesPerDay ?? "—"
                    }
                  />
                  <MetricRow
                    label="Age (days)"
                    mine={result.compare.structural.mine.ageDays ?? "—"}
                    theirs={result.compare.structural.theirs.ageDays ?? "—"}
                  />
                  <MetricRow
                    label="Views (unreliable)"
                    mine={result.compare.structural.mine.views}
                    theirs={result.compare.structural.theirs.views}
                  />
                </tbody>
              </table>
            </div>
            {result.compare.structural.priceDelta != null && (
              <p className="font-mono text-xs text-zinc-500">
                Price delta (yours − theirs):{" "}
                <span className="text-zinc-300">
                  ${result.compare.structural.priceDelta}
                </span>
              </p>
            )}
            {recs && <RecommendBox rec={recs.structural} />}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Their compliance with your SEO rules
            </h2>
            <p className="text-sm text-zinc-400">
              Score{" "}
              <span
                className={
                  result.compare.theirCompliance.score >= 80
                    ? "text-emerald-400"
                    : result.compare.theirCompliance.score >= 60
                      ? "text-amber-400"
                      : "text-red-400"
                }
              >
                {result.compare.theirCompliance.score}
              </span>
              {" · "}
              {result.compare.theirCompliance.findings.length} finding
              {result.compare.theirCompliance.findings.length === 1 ? "" : "s"}
            </p>
            {result.compare.theirCompliance.findings.length > 0 ? (
              <ul className="space-y-1.5">
                {result.compare.theirCompliance.findings.map((f) => (
                  <li
                    key={f.id}
                    className="rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-300"
                  >
                    <span
                      className={
                        f.severity === "high"
                          ? "text-red-400"
                          : f.severity === "medium"
                            ? "text-amber-400"
                            : "text-zinc-500"
                      }
                    >
                      [{f.severity}]
                    </span>{" "}
                    {f.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-400">
                They already follow your conventions closely.
              </p>
            )}
            {recs && <RecommendBox rec={recs.compliance} />}
          </section>
        </div>
      )}
    </div>
  );
}

function RecommendBox({
  rec,
  onCopyItems,
  copyLabel = "Copy items",
  children,
}: {
  rec: Recommendation;
  onCopyItems?: () => void;
  copyLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded border border-amber-900/40 bg-amber-950/15 px-3 py-3">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-500">
          Recommended to use
        </p>
        {onCopyItems && (
          <button
            type="button"
            onClick={onCopyItems}
            className="rounded border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-zinc-500"
          >
            {copyLabel}
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-200">{rec.summary}</p>
      {rec.items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {rec.items.map((item) => (
            <li
              key={item}
              className="font-mono text-xs text-amber-100/90 before:mr-1.5 before:text-amber-600 before:content-['→']"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      {children}
      {rec.rationale && (
        <p className="mt-2 text-xs text-zinc-500">{rec.rationale}</p>
      )}
    </div>
  );
}

function ListingCard({
  label,
  title,
  url,
  favorites,
  views,
  price,
  currency,
  accent,
}: {
  label: string;
  title: string;
  url: string | null;
  favorites: number;
  views: number;
  price: number | null;
  currency: string | null;
  accent: "amber" | "zinc";
}) {
  return (
    <div
      className={`rounded border px-4 py-3 ${
        accent === "amber"
          ? "border-amber-900/50 bg-amber-950/20"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-100">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-amber-400"
          >
            {title}
          </a>
        ) : (
          title
        )}
      </p>
      <p className="mt-2 font-mono text-xs text-zinc-500">
        Favs {favorites} · Views {views}
        {price != null ? ` · $${price} ${currency || ""}` : ""}
      </p>
    </div>
  );
}

function TagBucket({
  title,
  tags,
  tone,
}: {
  title: string;
  tags: string[];
  tone: "amber" | "zinc" | "emerald";
}) {
  const chip =
    tone === "amber"
      ? "border-amber-900/50 bg-amber-950/30 text-amber-200"
      : tone === "emerald"
        ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-200"
        : "border-zinc-800 bg-zinc-900 text-zinc-300";

  return (
    <div className="rounded border border-zinc-800 p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
        {title}{" "}
        <span className="text-zinc-600">({tags.length})</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className={`rounded border px-2 py-0.5 font-mono text-[11px] ${chip}`}
          >
            {t}
          </span>
        ))}
        {!tags.length && (
          <span className="text-xs text-zinc-600">None</span>
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  mine,
  theirs,
}: {
  label: string;
  mine: string | number;
  theirs: string | number;
}) {
  return (
    <tr className="border-t border-zinc-800/80">
      <td className="px-3 py-1.5 text-zinc-500">{label}</td>
      <td className="px-3 py-1.5 text-right">{mine}</td>
      <td className="px-3 py-1.5 text-right">{theirs}</td>
    </tr>
  );
}
