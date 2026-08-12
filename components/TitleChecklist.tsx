"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ALL_CHECKLIST_CATEGORIES,
  COMMUNITY_LISTINGS,
  EMPTY_CHECKLIST_STATE,
  TARGETED_LISTINGS,
  googleImagesUrl,
  type ChecklistCategory,
  type ChecklistState,
} from "@/lib/title-checklist";
import { ErrorBanner } from "./ui";

type Filter = "all" | "todo" | "done";

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-zinc-400">
          {done} / {total} titles
        </span>
        <span className="font-mono text-xs text-zinc-500">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-700/80 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  state,
  saving,
  onToggleCategory,
}: {
  category: ChecklistCategory;
  state: ChecklistState;
  saving: boolean;
  onToggleCategory: (id: string) => void;
}) {
  const listingDone = state.doneCategories.includes(category.id);
  const generateHref = `/?subject=${encodeURIComponent(category.title)}`;

  return (
    <li
      className={`border-b border-zinc-800/80 px-4 py-4 last:border-b-0 ${
        listingDone ? "bg-zinc-900/40" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={listingDone}
            disabled={saving}
            onChange={() => onToggleCategory(category.id)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 text-amber-600 focus:ring-amber-700/40 disabled:opacity-50"
          />
          <span className="min-w-0">
            <span
              className={`block text-sm font-medium ${
                listingDone ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}
            >
              {category.title}
            </span>
            <span className="mt-0.5 block font-mono text-xs text-zinc-600">
              {category.items.length} mockup refs
            </span>
          </span>
        </label>
        <Link
          href={generateHref}
          className="shrink-0 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
        >
          Generate →
        </Link>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5 pl-7">
        {category.items.map((item) => (
          <li key={item}>
            <a
              href={googleImagesUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 font-mono text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              title={`Search Google Images for “${item}”`}
            >
              {item}
            </a>
          </li>
        ))}
      </ul>
    </li>
  );
}

function Section({
  title,
  hint,
  categories,
  state,
  filter,
  saving,
  onToggleCategory,
}: {
  title: string;
  hint: string;
  categories: ChecklistCategory[];
  state: ChecklistState;
  filter: Filter;
  saving: boolean;
  onToggleCategory: (id: string) => void;
}) {
  const visible = categories.filter((c) => {
    const done = state.doneCategories.includes(c.id);
    if (filter === "todo") return !done;
    if (filter === "done") return done;
    return true;
  });
  const doneCount = categories.filter((c) =>
    state.doneCategories.includes(c.id)
  ).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
        </div>
        <p className="font-mono text-xs text-zinc-600">
          {doneCount}/{categories.length}
        </p>
      </div>
      <div className="overflow-hidden rounded border border-zinc-800">
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-600">
            Nothing in this filter.
          </p>
        ) : (
          <ul>
            {visible.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                state={state}
                saving={saving}
                onToggleCategory={onToggleCategory}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function TitleChecklist() {
  const [state, setState] = useState<ChecklistState>(EMPTY_CHECKLIST_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const stateRef = useRef(state);
  const saveChain = useRef(Promise.resolve());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/titles-checklist", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setState({
        doneCategories: Array.isArray(json.doneCategories)
          ? json.doneCategories
          : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalDone = useMemo(
    () =>
      ALL_CHECKLIST_CATEGORIES.filter((c) =>
        state.doneCategories.includes(c.id)
      ).length,
    [state.doneCategories]
  );

  function toggleCategory(id: string) {
    const snapshotBefore = stateRef.current;
    const has = snapshotBefore.doneCategories.includes(id);
    const next: ChecklistState = {
      doneCategories: has
        ? snapshotBefore.doneCategories.filter((x) => x !== id)
        : [...snapshotBefore.doneCategories, id],
    };

    setState(next);
    stateRef.current = next;
    setSaving(true);
    setError(null);

    // Serialize saves so rapid toggles don't last-write-wins against each other.
    saveChain.current = saveChain.current
      .then(async () => {
        const payload = stateRef.current;
        const res = await fetch("/api/titles-checklist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doneCategories: payload.doneCategories }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to save");
        const confirmed: ChecklistState = {
          doneCategories: Array.isArray(json.doneCategories)
            ? json.doneCategories
            : payload.doneCategories,
        };
        setState(confirmed);
        stateRef.current = confirmed;
      })
      .catch(async (err) => {
        setError(err instanceof Error ? err.message : "Failed to save");
        // Re-load server state instead of rolling back to a stale local snapshot.
        try {
          const res = await fetch("/api/titles-checklist", {
            cache: "no-store",
          });
          const json = await res.json();
          if (res.ok) {
            const restored: ChecklistState = {
              doneCategories: Array.isArray(json.doneCategories)
                ? json.doneCategories
                : snapshotBefore.doneCategories,
            };
            setState(restored);
            stateRef.current = restored;
          } else {
            setState(snapshotBefore);
            stateRef.current = snapshotBefore;
          }
        } catch {
          setState(snapshotBefore);
          stateRef.current = snapshotBefore;
        }
      })
      .finally(() => {
        setSaving(false);
      });
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "todo", label: "To do" },
    { id: "done", label: "Done" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Titles</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Checklist of listing concepts to create. Each concept uses 9 vehicle
            mockup references so listings feel distinct while targeting broader
            search intents.
          </p>
        </div>
        <div className="flex gap-1 rounded border border-zinc-800 p-0.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded px-3 py-1 text-xs transition ${
                filter === f.id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ProgressBar
        done={totalDone}
        total={ALL_CHECKLIST_CATEGORIES.length}
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          <Section
            title="Community listings"
            hint="Use 9 different vehicle mockups — click for Google Images"
            categories={COMMUNITY_LISTINGS}
            state={state}
            filter={filter}
            saving={saving}
            onToggleCategory={toggleCategory}
          />
          <Section
            title="Targeted listings"
            hint="Use 9 different vehicle mockups for each search intent — click for Google Images"
            categories={TARGETED_LISTINGS}
            state={state}
            filter={filter}
            saving={saving}
            onToggleCategory={toggleCategory}
          />
        </>
      )}

      <p className="text-xs text-zinc-600">
        Progress is saved to Supabase. Tick a title when the listing is live;
        vehicle chips open Google Images for mockup reference.
      </p>
    </div>
  );
}
