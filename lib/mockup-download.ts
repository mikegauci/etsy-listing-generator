const FAL_MEDIA_HOSTS = new Set(["fal.media"]);

function supabaseMockupsHosts(): string[] {
  const raw =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!raw) return [];
  try {
    return [new URL(raw).host];
  } catch {
    return [];
  }
}

export function isAllowedMockupDownloadUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  if (supabaseMockupsHosts().includes(parsed.host)) {
    return parsed.pathname.startsWith("/storage/v1/object/public/mockups/");
  }

  if (
    FAL_MEDIA_HOSTS.has(parsed.host) ||
    parsed.host.endsWith(".fal.media")
  ) {
    return true;
  }

  return false;
}

export function safeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "mockup";
}

export function mockupDownloadFilename(
  colorLabel: string,
  variant: string,
  ext: string
): string {
  const slug = colorLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return safeDownloadFilename(`${slug || "mockup"}-mockup-${variant}.${ext}`);
}

export function extensionFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {
    // ignore
  }
  return fallback;
}
