"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CopyField } from "./CopyField";
import { ErrorBanner, fieldClass } from "./ui";
import { formatTagsLine, parseTagsLine, TAG_COUNT } from "@/lib/tags";
import { PRODUCT_TYPES } from "@/lib/types";
import type { ListingOutput } from "@/lib/types";
import {
  TSHIRT_COLORS,
  TSHIRT_SIZES,
  MEDIA_SLOTS,
  MEDIA_ALT_TEXT_MAX,
} from "@/lib/product-options";

type Result = ListingOutput & { id?: string | null; isMock?: boolean };

const PROGRESS_STAGES = [
  { until: 25, label: "Scanning marketplace…" },
  { until: 50, label: "Matching your shop…" },
  { until: 75, label: "Writing listing…" },
  { until: 95, label: "Finishing SEO…" },
];

function progressLabel(pct: number): string {
  for (const stage of PROGRESS_STAGES) {
    if (pct < stage.until) return stage.label;
  }
  return "Almost done…";
}

export function GenerateForm() {
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState("");
  const [productType, setProductType] = useState<string>(PRODUCT_TYPES[0]);
  const [colors, setColors] = useState("Black, White");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("subject");
    if (fromQuery) setSubject(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (finishTimer.current) clearTimeout(finishTimer.current);
    };
  }, []);

  function startProgress() {
    setProgress(4);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (finishTimer.current) clearTimeout(finishTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const step = prev < 40 ? 3.2 : prev < 70 ? 1.8 : 0.7;
        return Math.min(92, prev + step);
      });
    }, 280);
  }

  function finishProgress() {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setProgress(100);
    finishTimer.current = setTimeout(() => setProgress(0), 700);
  }

  function failProgress() {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    if (finishTimer.current) {
      clearTimeout(finishTimer.current);
      finishTimer.current = null;
    }
    setProgress(0);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    startProgress();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          productType,
          colors,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
      finishProgress();
    } catch (err) {
      failProgress();
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  const showProgress = loading || progress > 0;
  const displayPct = Math.round(progress);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            Generate listing
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Compares live Etsy marketplace listings for your keyword against
            your catalog to shape titles, tags, and descriptions.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Vehicle / subject
          </span>
          <input
            className={fieldClass}
            required
            placeholder="e.g. Ford Mustang, Honda NSX NA1"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="font-mono text-xs text-zinc-600">
            Niche keyword drives marketplace search + your shop comps for
            title/SEO.
          </p>
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Product type
          </span>
          <select
            className={fieldClass}
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          >
            {PRODUCT_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Color / variant options
          </span>
          <input
            className={fieldClass}
            placeholder="Black, White"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
          />
        </label>

        {productType === "t-shirt" && (
          <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">T-shirt variants</p>
            <p className="mt-1 font-mono">
              Colors: {TSHIRT_COLORS.join(", ")}
            </p>
            <p className="font-mono">Sizes: {TSHIRT_SIZES.join(", ")}</p>
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate listing"}
            </button>
            {showProgress && (
              <span className="font-mono text-sm tabular-nums text-amber-500">
                {displayPct}%
              </span>
            )}
          </div>
          {showProgress && (
            <div className="space-y-1">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={displayPct}
                aria-label="Generation progress"
              >
                <div
                  className="h-full rounded-full bg-amber-500 transition-[width] duration-300 ease-out"
                  style={{ width: `${displayPct}%` }}
                />
              </div>
              <p className="font-mono text-xs text-zinc-500">
                {loading ? progressLabel(displayPct) : "Done"}
              </p>
            </div>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Preview
          </h2>
          {result && (
            <span className="font-mono text-xs text-zinc-500">
              {result.isMock ? "MOCK" : "OPENAI"}
              {result.id ? ` · saved ${result.id.slice(0, 8)}` : ""}
            </span>
          )}
        </div>

        {!result ? (
          <div className="rounded border border-dashed border-zinc-800 px-4 py-16 text-center text-sm text-zinc-600">
            Generated listing appears here - editable, with copy buttons.
          </div>
        ) : (
          <div className="space-y-4">
            <CopyField
              label="Title"
              value={result.title}
              onChange={(v) => setResult({ ...result, title: v })}
            />
            <CopyField
              label={`Tags (${result.tags.length}/${TAG_COUNT})`}
              value={formatTagsLine(result.tags)}
              copyValue={formatTagsLine(result.tags)}
              singleLine
              hint="Comma-separated · max 13 tags · ≤20 chars each · Copy pastes into Etsy."
              onChange={(v) =>
                setResult({
                  ...result,
                  tags: parseTagsLine(v),
                })
              }
            />
            <CopyField
              label="Description"
              value={result.description}
              multiline
              rows={14}
              onChange={(v) => setResult({ ...result, description: v })}
            />

            {result.mediaAltTexts && result.mediaAltTexts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Media Alt Texts ({result.mediaAltTexts.length})
                </h3>
                {result.mediaAltTexts.map((item, idx) => {
                  const slotLabel = MEDIA_SLOTS[idx] || item.slot;
                  return (
                    <CopyField
                      key={`${idx}-${slotLabel}`}
                      label={`${idx + 1}. ${slotLabel}`}
                      value={item.altText}
                      multiline
                      rows={4}
                      hint={`${item.altText.length} / ${MEDIA_ALT_TEXT_MAX} chars`}
                      onChange={(v) => {
                        const updated = [...result.mediaAltTexts];
                        updated[idx] = {
                          slot: slotLabel,
                          altText: v.slice(0, MEDIA_ALT_TEXT_MAX),
                        };
                        setResult({ ...result, mediaAltTexts: updated });
                      }}
                    />
                  );
                })}
              </div>
            )}

            <CopyField
              label="SEO notes"
              value={result.seoNotes}
              multiline
              rows={4}
              onChange={(v) => setResult({ ...result, seoNotes: v })}
            />
            {result.referencedListings?.length > 0 && (
              <CopyField
                label="Referenced listings"
                value={result.referencedListings.join("\n")}
                multiline
                rows={4}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
