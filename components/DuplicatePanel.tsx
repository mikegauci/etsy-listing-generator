"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { ErrorBanner, SuccessBanner, fieldClass } from "./ui";

type ListingOption = {
  id: string;
  etsyListingId: number;
  title: string;
  featuredImageUrl: string | null;
};

type SourceImage = {
  listingImageId: number;
  rank: number;
  altText: string;
  urlThumb: string | null;
  urlFull: string | null;
};

type SourceVideo = {
  videoId: number;
  thumbnailUrl: string | null;
  videoUrl: string | null;
};

type SourcePayload = {
  listingId: number;
  title: string;
  description: string;
  tags: string[];
  url: string | null;
  images: SourceImage[];
  video: SourceVideo | null;
};

type PhotoKeep = {
  key: string;
  type: "keep";
  listingImageId: number;
  altText: string;
  previewUrl: string | null;
};

type PhotoUpload = {
  key: string;
  type: "upload";
  altText: string;
  previewUrl: string | null;
  file: File;
};

type PhotoRow = PhotoKeep | PhotoUpload;

type VideoMode = "keep" | "none" | "upload";

type DuplicateResult = {
  listingId: number;
  url: string;
  state: string;
  mediaErrors: string[];
  inventoryWarning: string | null;
};

const TAG_MAX = 13;
const TAG_LEN = 20;
const TITLE_MAX = 140;
const ALT_MAX = 500;
const IMAGE_MAX = 20;

function newKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function DuplicatePanel() {
  const formId = useId();
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [etsyConnected, setEtsyConnected] = useState(true);
  const [sourceId, setSourceId] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<DuplicateResult | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsLine, setTagsLine] = useState("");
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [videoMode, setVideoMode] = useState<VideoMode>("none");
  const [sourceVideo, setSourceVideo] = useState<SourceVideo | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await fetch("/api/duplicate/listings", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setListings(json.listings || []);
        setEtsyConnected(Boolean(json.etsyConnected));
      }
    } catch {
      // picker stays empty
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  async function loadSource(listingId: string) {
    setSourceId(listingId);
    setResult(null);
    setMessage(null);
    setError(null);
    setVideoFile(null);

    if (!listingId) {
      setTitle("");
      setDescription("");
      setTagsLine("");
      setPhotos([]);
      setSourceVideo(null);
      setVideoMode("none");
      return;
    }

    setLoadingSource(true);
    try {
      const res = await fetch(
        `/api/duplicate/source?listingId=${encodeURIComponent(listingId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load listing");

      const source = json as SourcePayload;
      setTitle(source.title);
      setDescription(source.description);
      setTagsLine(source.tags.join(", "));
      setPhotos(
        source.images.map((img) => ({
          key: newKey(`keep-${img.listingImageId}`),
          type: "keep" as const,
          listingImageId: img.listingImageId,
          altText: img.altText || "",
          previewUrl: img.urlThumb || img.urlFull,
        }))
      );
      setSourceVideo(source.video);
      setVideoMode(source.video ? "keep" : "none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing");
      setTitle("");
      setDescription("");
      setTagsLine("");
      setPhotos([]);
      setSourceVideo(null);
      setVideoMode("none");
    } finally {
      setLoadingSource(false);
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const row = prev[index];
      if (row?.type === "upload" && row.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(row.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateAlt(index: number, altText: string) {
    setPhotos((prev) =>
      prev.map((row, i) => (i === index ? { ...row, altText } : row))
    );
  }

  function onAddPhotos(files: FileList | null) {
    if (!files?.length) return;
    const remaining = IMAGE_MAX - photos.length;
    if (remaining <= 0) {
      setError(`Etsy allows at most ${IMAGE_MAX} images`);
      return;
    }
    const additions: PhotoUpload[] = Array.from(files)
      .slice(0, remaining)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        key: newKey("upload"),
        type: "upload" as const,
        altText: "",
        previewUrl: URL.createObjectURL(file),
        file,
      }));
    if (!additions.length) {
      setError("Choose image files to upload");
      return;
    }
    setError(null);
    setPhotos((prev) => [...prev, ...additions]);
  }

  function parseTags(line: string): string[] {
    return line
      .split(",")
      .map((t) => t.trim().replace(/\s+/g, " "))
      .filter(Boolean);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setResult(null);

    try {
      if (!sourceId) throw new Error("Pick a source listing");
      if (!title.trim()) throw new Error("Title is required");
      if (title.trim().length > TITLE_MAX) {
        throw new Error(`Title must be at most ${TITLE_MAX} characters`);
      }
      if (!description.trim()) throw new Error("Description is required");
      if (!photos.length) throw new Error("At least one photo is required");

      const tags = parseTags(tagsLine);
      if (tags.length > TAG_MAX) {
        throw new Error(`Etsy allows at most ${TAG_MAX} tags`);
      }
      for (const tag of tags) {
        if (tag.length > TAG_LEN) {
          throw new Error(`Tag exceeds ${TAG_LEN} characters: "${tag}"`);
        }
      }

      if (videoMode === "upload" && !videoFile) {
        throw new Error("Choose a video file or switch video mode");
      }

      const form = new FormData();
      form.set("sourceListingId", sourceId);
      form.set("title", title.trim());
      form.set("description", description.trim());
      form.set("tags", JSON.stringify(tags));
      form.set("videoMode", videoMode);

      const photoPlan = photos.map((row) => {
        if (row.type === "keep") {
          return {
            type: "keep" as const,
            listingImageId: row.listingImageId,
            altText: row.altText.slice(0, ALT_MAX),
          };
        }
        form.append(`photo_${row.key}`, row.file, row.file.name);
        return {
          type: "upload" as const,
          clientKey: row.key,
          altText: row.altText.slice(0, ALT_MAX),
        };
      });
      form.set("photoPlan", JSON.stringify(photoPlan));

      if (videoMode === "upload" && videoFile) {
        form.append("video", videoFile, videoFile.name);
      }

      const res = await fetch("/api/duplicate", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create draft");

      const created = json as DuplicateResult;
      setResult(created);
      const parts = [`Draft #${created.listingId} created.`];
      if (created.inventoryWarning) {
        parts.push("Inventory copy warning — check variations in Etsy.");
      }
      if (created.mediaErrors?.length) {
        parts.push(`${created.mediaErrors.length} media issue(s).`);
      }
      setMessage(parts.join(" "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create draft");
    } finally {
      setSubmitting(false);
    }
  }

  const tagCount = parseTags(tagsLine).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Duplicate listing
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick an active listing, edit photos, video, title, description, and
          tags, then create a draft on Etsy. Publish manually when ready.
        </p>
      </div>

      {!etsyConnected && (
        <ErrorBanner message="Etsy is not connected. Connect from Shop data first." />
      )}

      {!loadingListings && etsyConnected && !listings.length && (
        <ErrorBanner message="No active listings synced. Sync from Shop data first." />
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
            Source listing (active only)
          </p>
          {loadingListings ? (
            <p className="text-sm text-zinc-500">
              Loading listings and featured images…
            </p>
          ) : (
            <div
              role="listbox"
              aria-label="Source listing"
              className="max-h-80 space-y-1 overflow-y-auto border border-zinc-800 p-1"
            >
              {listings.map((l) => {
                const selected = sourceId === String(l.etsyListingId);
                return (
                  <button
                    key={l.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={loadingSource || submitting}
                    onClick={() => loadSource(String(l.etsyListingId))}
                    className={`flex w-full items-center gap-3 px-2 py-2 text-left transition ${
                      selected
                        ? "bg-amber-600/20 ring-1 ring-amber-600/50"
                        : "hover:bg-zinc-900"
                    } disabled:opacity-50`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden bg-zinc-900">
                      {l.featuredImageUrl ? (
                        <img
                          src={l.featuredImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-zinc-100">
                        {l.title}
                      </p>
                      <p className="font-mono text-xs text-zinc-500">
                        #{l.etsyListingId}
                      </p>
                    </div>
                  </button>
                );
              })}
              {!listings.length && (
                <p className="px-2 py-3 text-sm text-zinc-500">
                  No active listings available.
                </p>
              )}
            </div>
          )}
        </div>

        {loadingSource && (
          <p className="text-sm text-zinc-500">Loading listing details…</p>
        )}

        {sourceId && !loadingSource && (
          <>
            <div>
              <label
                htmlFor={`${formId}-title`}
                className="mb-1 block text-xs uppercase tracking-wide text-zinc-500"
              >
                Title ({title.length}/{TITLE_MAX})
              </label>
              <input
                id={`${formId}-title`}
                className={fieldClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX}
                required
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-description`}
                className="mb-1 block text-xs uppercase tracking-wide text-zinc-500"
              >
                Description
              </label>
              <textarea
                id={`${formId}-description`}
                className={`${fieldClass} min-h-[220px] font-mono text-xs leading-relaxed`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-tags`}
                className="mb-1 block text-xs uppercase tracking-wide text-zinc-500"
              >
                Tags ({tagCount}/{TAG_MAX}, max {TAG_LEN} chars each)
              </label>
              <textarea
                id={`${formId}-tags`}
                className={`${fieldClass} min-h-[72px]`}
                value={tagsLine}
                onChange={(e) => setTagsLine(e.target.value)}
                placeholder="comma, separated, tags"
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Photos ({photos.length}/{IMAGE_MAX})
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Reorder, edit alt text, remove, or add new uploads.
                  </p>
                </div>
                <label className="cursor-pointer rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900">
                  Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      onAddPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <ul className="space-y-3">
                {photos.map((photo, index) => (
                  <li
                    key={photo.key}
                    className="flex flex-col gap-3 border border-zinc-800 p-3 sm:flex-row"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden bg-zinc-900">
                      {photo.previewUrl ? (
                        <img
                          src={photo.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                          No preview
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>#{index + 1}</span>
                        <span>
                          {photo.type === "keep"
                            ? `Keep #${photo.listingImageId}`
                            : `New · ${photo.file.name}`}
                        </span>
                      </div>
                      <textarea
                        className={`${fieldClass} min-h-[64px] text-xs`}
                        value={photo.altText}
                        maxLength={ALT_MAX}
                        onChange={(e) => updateAlt(index, e.target.value)}
                        placeholder="Alt text"
                      />
                      <p className="text-[11px] text-zinc-600">
                        {photo.altText.length}/{ALT_MAX}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                          disabled={index === 0}
                          onClick={() => movePhoto(index, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                          disabled={index === photos.length - 1}
                          onClick={() => movePhoto(index, 1)}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-900/60 px-2 py-1 text-xs text-red-300"
                          onClick={() => removePhoto(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Video
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${formId}-video`}
                    checked={videoMode === "keep"}
                    disabled={!sourceVideo}
                    onChange={() => {
                      setVideoMode("keep");
                      setVideoFile(null);
                    }}
                  />
                  Keep source video
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${formId}-video`}
                    checked={videoMode === "none"}
                    onChange={() => {
                      setVideoMode("none");
                      setVideoFile(null);
                    }}
                  />
                  No video
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${formId}-video`}
                    checked={videoMode === "upload"}
                    onChange={() => setVideoMode("upload")}
                  />
                  Upload new
                </label>
              </div>
              {sourceVideo && videoMode === "keep" && (
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                  {sourceVideo.thumbnailUrl ? (
                    <img
                      src={sourceVideo.thumbnailUrl}
                      alt=""
                      className="h-16 w-16 object-cover"
                    />
                  ) : null}
                  <span>Video #{sourceVideo.videoId}</span>
                </div>
              )}
              {videoMode === "upload" && (
                <input
                  type="file"
                  accept="video/*"
                  className={fieldClass}
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || loadingSource}
              className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
            >
              {submitting ? "Creating draft…" : "Create Etsy draft"}
            </button>
          </>
        )}
      </form>

      {message && <SuccessBanner message={message} />}
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-2 border border-zinc-800 p-4 text-sm text-zinc-300">
          <p>
            Draft listing ID:{" "}
            <span className="font-mono text-zinc-100">{result.listingId}</span>
          </p>
          <p>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline"
            >
              Open on Etsy
            </a>
          </p>
          {result.inventoryWarning && (
            <p className="text-amber-300/90">
              Inventory warning: {result.inventoryWarning}
            </p>
          )}
          {result.mediaErrors?.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-red-300">
              {result.mediaErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
