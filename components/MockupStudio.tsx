"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ErrorBanner, fieldClass } from "./ui";
import { getShop } from "@/lib/shops";
import { useActiveShopId } from "./ShopSwitcher";
import type { MockupColor } from "@/lib/shops";
import { mockupDownloadFilename } from "@/lib/mockup-download";

type ColorResult = {
  colorId: string;
  colorLabel: string;
  colorHex: string;
  status: "idle" | "uploading" | "generating" | "done" | "error";
  publicUrl?: string;
  upscaledUrl?: string;
  upscaleStatus?: "idle" | "upscaling" | "done" | "error";
  upscaleError?: string;
  error?: string;
};

const RESOLUTION_OPTIONS = ["0.5K", "1K", "2K", "4K"] as const;

function makeRunId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}`;
}

async function triggerMockupDownload(url: string, fileName: string) {
  const params = new URLSearchParams({ url, filename: fileName });
  const res = await fetch(`/api/mockups/download?${params.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "Download failed"
    );
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function MockupStudio() {
  const shopId = useActiveShopId();
  const shop = getShop(shopId);
  const mockups = shop.mockups;

  const [baseId, setBaseId] = useState(mockups?.bases[0]?.id ?? "");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [personalizationName, setPersonalizationName] = useState("");
  const [resolution, setResolution] =
    useState<(typeof RESOLUTION_OPTIONS)[number]>("0.5K");
  const [selectedColors, setSelectedColors] = useState<string[]>(
    mockups?.colors.map((c) => c.id) ?? []
  );
  const [results, setResults] = useState<Record<string, ColorResult>>({});
  const [runId, setRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingColorId, setDownloadingColorId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!mockups) return;
    setBaseId(mockups.bases[0]?.id ?? "");
    setSelectedColors(mockups.colors.map((c) => c.id));
    setResults({});
    setRunId(null);
  }, [shopId, mockups]);

  useEffect(() => {
    if (!artworkFile) {
      setArtworkPreview(null);
      return;
    }
    const url = URL.createObjectURL(artworkFile);
    setArtworkPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [artworkFile]);

  const colorsById = useMemo(() => {
    const map = new Map<string, MockupColor>();
    for (const c of mockups?.colors ?? []) map.set(c.id, c);
    return map;
  }, [mockups]);

  const upscalableColors = useMemo(() => {
    return (mockups?.colors ?? [])
      .filter((c) => selectedColors.includes(c.id))
      .filter((c) => {
        const r = results[c.id];
        return (
          r?.status === "done" &&
          r.publicUrl &&
          !r.upscaledUrl &&
          r.upscaleStatus !== "upscaling"
        );
      });
  }, [mockups, selectedColors, results]);

  const isUpscalingAny = useMemo(
    () => Object.values(results).some((r) => r.upscaleStatus === "upscaling"),
    [results]
  );

  function toggleColor(id: string) {
    setSelectedColors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function generateOne(opts: {
    runId: string;
    artworkUrl: string;
    artworkName: string;
    color: MockupColor;
  }) {
    setResults((prev) => ({
      ...prev,
      [opts.color.id]: {
        colorId: opts.color.id,
        colorLabel: opts.color.label,
        colorHex: opts.color.hex,
        status: "generating",
      },
    }));

    try {
      const res = await fetch("/api/mockups/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          runId: opts.runId,
          baseImageId: baseId,
          colorId: opts.color.id,
          artworkUrl: opts.artworkUrl,
          artworkName: opts.artworkName,
          personalizationName: personalizationName.trim() || undefined,
          resolution,
          aspectRatio: "1:1",
          outputFormat: "jpeg",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }
      setResults((prev) => ({
        ...prev,
        [opts.color.id]: {
          colorId: opts.color.id,
          colorLabel: opts.color.label,
          colorHex: opts.color.hex,
          status: "done",
          publicUrl: data.publicUrl,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [opts.color.id]: {
          colorId: opts.color.id,
          colorLabel: opts.color.label,
          colorHex: opts.color.hex,
          status: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      }));
    }
  }

  async function upscaleOne(color: MockupColor) {
    const result = results[color.id];
    if (!runId || !result?.publicUrl) return;

    setResults((prev) => ({
      ...prev,
      [color.id]: {
        ...prev[color.id],
        upscaleStatus: "upscaling",
        upscaleError: undefined,
      },
    }));

    try {
      const res = await fetch("/api/mockups/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          runId,
          colorId: color.id,
          sourceUrl: result.publicUrl,
          colorLabel: color.label,
          colorHex: color.hex,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upscale failed");
      }
      setResults((prev) => ({
        ...prev,
        [color.id]: {
          ...prev[color.id],
          upscaleStatus: "done",
          upscaledUrl: data.publicUrl,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [color.id]: {
          ...prev[color.id],
          upscaleStatus: "error",
          upscaleError: err instanceof Error ? err.message : "Upscale failed",
        },
      }));
    }
  }

  async function upscaleAll() {
    await Promise.all(upscalableColors.map((color) => upscaleOne(color)));
  }

  async function downloadMockup(
    color: MockupColor,
    url: string,
    variant: string,
    ext: string
  ) {
    setDownloadingColorId(color.id);
    try {
      await triggerMockupDownload(
        url,
        mockupDownloadFilename(color.label, variant, ext)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingColorId(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mockups || !artworkFile || !baseId || selectedColors.length === 0) {
      setError("Choose a base, artwork PNG, and at least one colour.");
      return;
    }

    setRunning(true);
    setError(null);
    const nextRunId = makeRunId();
    setRunId(nextRunId);

    try {
      const uploadForm = new FormData();
      uploadForm.set("artwork", artworkFile);
      const uploadRes = await fetch("/api/mockups/artwork", {
        method: "POST",
        body: uploadForm,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Artwork upload failed");
      }

      const colors = selectedColors
        .map((id) => colorsById.get(id))
        .filter(Boolean) as MockupColor[];

      await Promise.all(
        colors.map((color) =>
          generateOne({
            runId: nextRunId,
            artworkUrl: uploadData.artworkUrl,
            artworkName: uploadData.artworkName,
            color,
          })
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mockup run failed");
    } finally {
      setRunning(false);
    }
  }

  if (!mockups) {
    return (
      <div className="rounded border border-dashed border-zinc-800 px-4 py-16 text-center text-sm text-zinc-500">
        Mockup generation is not configured for {shop.name}. Switch to Little
        & Loom in the header.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Mockup studio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload artwork, pick fleece colours, and generate square JPEG mockups
          via FAL nano-banana-2/edit (currently {resolution}, 1:1). Upscale
          approved results to 2K with Recraft Crisp when ready.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Base mockup
            </span>
            <select
              className={fieldClass}
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
            >
              {mockups.bases.map((base) => (
                <option key={base.id} value={base.id}>
                  {base.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Artwork PNG
            </span>
            <input
              type="file"
              accept="image/png"
              className={fieldClass}
              onChange={(e) =>
                setArtworkFile(e.target.files?.[0] ?? null)
              }
            />
          </label>

          {artworkPreview && (
            <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-950 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={artworkPreview}
                alt="Artwork preview"
                className="mx-auto max-h-40 object-contain"
              />
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Embroidered name (optional)
            </span>
            <input
              className={fieldClass}
              placeholder="e.g. Olivia"
              value={personalizationName}
              onChange={(e) => setPersonalizationName(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Resolution
            </span>
            <select
              className={fieldClass}
              value={resolution}
              onChange={(e) =>
                setResolution(e.target.value as (typeof RESOLUTION_OPTIONS)[number])
              }
            >
              {RESOLUTION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wide text-zinc-500">
              Blanket colours
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {mockups.colors.map((color) => (
                <label
                  key={color.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(color.id)}
                    onChange={() => toggleColor(color.id)}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-zinc-700"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && <ErrorBanner message={error} />}

          <button
            type="submit"
            disabled={running}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {running ? "Generating…" : "Generate mockups"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Results
            </h2>
            {upscalableColors.length > 1 && (
              <button
                type="button"
                disabled={isUpscalingAny}
                className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-zinc-700 disabled:opacity-50"
                onClick={() => void upscaleAll()}
              >
                {isUpscalingAny ? "Upscaling all…" : "Upscale all to 2K"}
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {mockups.colors
              .filter((c) => selectedColors.includes(c.id))
              .map((color) => {
                const result = results[color.id];
                const displayUrl = result?.upscaledUrl ?? result?.publicUrl;
                const previewUrl = result?.publicUrl;
                const isUpscaling = result?.upscaleStatus === "upscaling";
                const imageUrl =
                  isUpscaling && previewUrl ? previewUrl : displayUrl;
                return (
                  <div
                    key={color.id}
                    className="overflow-hidden rounded border border-zinc-800 bg-zinc-950/60"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                      <span className="text-sm text-zinc-200">
                        {color.label}
                        {result?.upscaledUrl && (
                          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-500">
                            2K
                          </span>
                        )}
                      </span>
                      <span
                        className="h-3 w-3 rounded-full border border-zinc-700"
                        style={{ backgroundColor: color.hex }}
                      />
                    </div>
                    <div className="relative aspect-square bg-zinc-900/50 p-2">
                      {result?.status === "done" && imageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt={color.label}
                            className="h-full w-full object-cover"
                          />
                          {isUpscaling && (
                            <div className="absolute inset-2 flex flex-col items-center justify-center rounded bg-zinc-950/75 backdrop-blur-[1px]">
                              <div
                                className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"
                                aria-hidden
                              />
                              <span className="mt-2 text-xs font-medium text-amber-500">
                                Upscaling…
                              </span>
                            </div>
                          )}
                        </>
                      ) : result?.status === "generating" ? (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-xs text-amber-500">
                            Generating…
                          </span>
                        </div>
                      ) : result?.status === "error" ? (
                        <div className="flex h-full items-center justify-center px-2">
                          <span className="text-center text-xs text-red-400">
                            {result.error}
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-xs text-zinc-600">Waiting</span>
                        </div>
                      )}
                    </div>
                    {result?.publicUrl && (
                      <div className="space-y-2 border-t border-zinc-800 p-2">
                        <div className="flex flex-wrap gap-2">
                          {result.upscaledUrl ? (
                            <button
                              type="button"
                              disabled={downloadingColorId === color.id}
                              className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
                              onClick={() =>
                                downloadMockup(
                                  color,
                                  result.upscaledUrl!,
                                  "2k",
                                  "png"
                                )
                              }
                            >
                              {downloadingColorId === color.id
                                ? "Downloading…"
                                : "Download 2K"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={downloadingColorId === color.id}
                              className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
                              onClick={() =>
                                downloadMockup(
                                  color,
                                  result.publicUrl!,
                                  resolution.toLowerCase(),
                                  "jpg"
                                )
                              }
                            >
                              {downloadingColorId === color.id
                                ? "Downloading…"
                                : "Download"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                result.upscaledUrl ?? result.publicUrl!
                              )
                            }
                          >
                            Copy URL
                          </button>
                          {result.status === "done" &&
                            !result.upscaledUrl &&
                            result.upscaleStatus !== "upscaling" && (
                              <button
                                type="button"
                                className="rounded bg-zinc-800 px-2 py-1 text-xs text-amber-500 hover:bg-zinc-700"
                                onClick={() => upscaleOne(color)}
                              >
                                Upscale to 2K
                              </button>
                            )}
                        </div>
                        {result.upscaleStatus === "error" && (
                          <p className="text-xs text-red-400">
                            {result.upscaleError}
                          </p>
                        )}
                        {result.upscaledUrl && result.publicUrl && (
                          <button
                            type="button"
                            disabled={downloadingColorId === color.id}
                            className="inline-block text-[11px] text-zinc-600 hover:text-zinc-400 disabled:opacity-50"
                            onClick={() =>
                              downloadMockup(
                                color,
                                result.publicUrl!,
                                resolution.toLowerCase(),
                                "jpg"
                              )
                            }
                          >
                            {downloadingColorId === color.id
                              ? "Downloading…"
                              : `Download preview (${resolution})`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </form>
    </div>
  );
}
