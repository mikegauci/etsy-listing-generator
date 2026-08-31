export function logMockupImageRequest(opts: {
  operation: string;
  provider: string;
  model: string;
  resolution?: string;
  quality?: string;
  format?: string;
}): void {
  console.log(`[mockup-image] ${opts.operation}`, {
    provider: opts.provider,
    model: opts.model,
    resolution: opts.resolution ?? "—",
    quality: opts.quality ?? "—",
    format: opts.format ?? "—",
  });
}
