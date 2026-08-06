"use client";

import {
  analyzeTitleTagOverlap,
  ETSY_TITLE_MAX,
  ETSY_TITLE_SOFT_MIN_WORDS,
  ETSY_TITLE_TARGET_WORDS,
} from "@/lib/title-tag-overlap";
import { EVERGREEN_TAGS } from "@/lib/tags";

export function TitleTagOverlapCheck({
  title,
  tags,
}: {
  title: string;
  tags: string[];
}) {
  const analysis = analyzeTitleTagOverlap(title || "", tags || []);
  if (analysis.totalCount === 0 && !title.trim()) return null;

  const evergreenCount = (tags || []).filter((t) =>
    EVERGREEN_TAGS.some(
      (e) => e.toLowerCase() === t.replace(/\s+/g, " ").trim().toLowerCase()
    )
  ).length;

  const ok =
    analysis.allCovered &&
    !analysis.titleTooShort &&
    !analysis.titleLooksStuffed &&
    analysis.repeatedTagWords.length === 0 &&
    analysis.singleWordTags.length === 0 &&
    evergreenCount >= 8;

  return (
    <div
      className={`rounded border px-3 py-3 text-sm leading-relaxed ${
        ok
          ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-100"
          : "border-amber-900/60 bg-amber-950/30 text-amber-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Title &amp; tag SEO check</span>
        <span className="font-mono text-xs tabular-nums opacity-80">
          {analysis.titleWordCount}/{ETSY_TITLE_TARGET_WORDS} words ·{" "}
          {analysis.titleLength}/{ETSY_TITLE_MAX} chars
          {analysis.totalCount > 0
            ? ` · tags ${analysis.coveredCount}/${analysis.totalCount}`
            : ""}
        </span>
      </div>

      <p className="mt-2 text-[13px] leading-snug opacity-90">
        Repeating key phrases from your title in your tags strengthens SEO by
        signaling to Etsy that those terms are especially relevant. You don&apos;t
        need every tag in the title — just make sure your most important title
        keywords are also used.
      </p>

      <ul className="mt-2 space-y-2 text-[13px] leading-snug">
        {analysis.titleTooShort && (
          <li>
            Title looks short (&lt;{ETSY_TITLE_SOFT_MIN_WORDS} words). Aim for
            about {ETSY_TITLE_TARGET_WORDS} words with personalized / photo /
            gift traits.
          </li>
        )}

        {analysis.titleLooksStuffed && analysis.stuffedSegment && (
          <li>
            Keyword dump: “{analysis.stuffedSegment}”. Keep the subject as the
            first comma group; move extras into separate groups (about 2–3
            traits each).
          </li>
        )}

        {analysis.singleWordTags.length > 0 && (
          <li>
            <span className="font-medium">Use multi-word tags.</span> Single
            words are too broad — aim for 2–3 words. Flagged:{" "}
            <span className="font-mono text-xs">
              {analysis.singleWordTags.join(", ")}
            </span>
          </li>
        )}

        {evergreenCount < 8 && (
          <li>
            Missing evergreen tags (have {evergreenCount}/10). Include core
            phrases like custom car shirt, graphic tshirt, gift for him/dad,
            custom photo shirt.
          </li>
        )}

        {analysis.repeatedTagWords.length > 0 && (
          <li>
            Repeated across niche tags:{" "}
            <span className="font-mono text-xs">
              {analysis.repeatedTagWords.join(", ")}
            </span>
            . Niche tags should stay distinct (evergreen core may share words).
          </li>
        )}

        {analysis.missing.length > 0 && (
          <li>
            <span className="font-medium">Title keywords missing in tags:</span>{" "}
            <span className="font-mono text-xs">
              {analysis.missing.join(", ")}
            </span>
          </li>
        )}

        {analysis.totalCount > 0 && analysis.allCovered && (
          <li className="opacity-90">
            Title phrases covered — niche tags + evergreen core.
          </li>
        )}
      </ul>

      {analysis.totalCount > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-current/15 pt-2">
          {analysis.phrases.map((item) => (
            <li
              key={`${item.kind}-${item.phrase}`}
              className="flex items-start gap-2 text-[13px]"
            >
              <span
                className={
                  item.covered ? "text-emerald-400" : "text-amber-400"
                }
                aria-hidden
              >
                {item.covered ? "✓" : "○"}
              </span>
              <span className="font-mono text-xs tracking-wide">
                {item.phrase}
                {item.kind === "word" ? (
                  <span className="opacity-60"> (word)</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
