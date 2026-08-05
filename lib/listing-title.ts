/** Ensure listing titles start with "Custom" (Motor Element catalog convention). */
export function ensureCustomTitlePrefix(title: string, max = 140): string {
  let t = title.replace(/\s+/g, " ").trim();
  if (!t) return "Custom";

  if (/^custom\b/i.test(t)) {
    t = t.replace(/^custom\b/i, "Custom");
  } else {
    t = `Custom ${t}`;
  }

  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd();
}
