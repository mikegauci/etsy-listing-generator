/** One-line comma-separated tags for display and Etsy paste. */
export function formatTagsLine(tags: string[] | null | undefined): string {
  return (tags || [])
    .flatMap((tag) => tag.split(/[\n\r]+/))
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

export function parseTagsLine(line: string): string[] {
  return line
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
