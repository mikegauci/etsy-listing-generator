/** Shared subject tokenization + listing ranking used for shop + marketplace comps. */

export function tokenizeSubject(subject: string, max = 6): string[] {
  return subject
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 1)
    .slice(0, max);
}

export type ScoredHaystack = {
  title: string;
  tags?: string[] | null;
  description?: string | null;
  category?: string | null;
  views?: number | null;
  num_favorers?: number | null;
};

export function scoreAgainstSubject(
  listing: ScoredHaystack,
  subjectTokens: string[],
  opts?: { productTokens?: string[]; digitalPenalty?: boolean }
): { score: number; nicheHit: boolean } {
  const hay =
    `${listing.title} ${(listing.tags || []).join(" ")} ${listing.description || ""} ${listing.category || ""}`.toLowerCase();
  let score =
    (listing.views || 0) * 0.01 + (listing.num_favorers || 0) * 0.05;

  for (const t of subjectTokens) {
    if (hay.includes(t)) score += 2000;
    if ((listing.title || "").toLowerCase().includes(t)) score += 1500;
  }

  for (const t of opts?.productTokens || []) {
    if (hay.includes(t)) score += 400;
  }

  if (
    opts?.digitalPenalty &&
    /\b(png|svg|digital download|sublimation)\b/i.test(listing.title || "")
  ) {
    score -= 500;
  }

  return {
    score,
    nicheHit: subjectTokens.some((t) => hay.includes(t)),
  };
}
