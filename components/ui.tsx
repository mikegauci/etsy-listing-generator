export const fieldClass =
  "w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <p className="rounded border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
      {message}
    </p>
  );
}
