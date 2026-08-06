"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
  /** Text copied to clipboard (defaults to value). */
  copyValue?: string;
  singleLine?: boolean;
  hint?: string;
};

export function CopyField({
  label,
  value,
  onChange,
  multiline,
  rows = 6,
  mono = true,
  copyValue,
  singleLine,
  hint,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textToCopy = copyValue ?? value;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function copy() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Copy failed");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopyError(null), 2000);
    }
  }

  const className = `w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600 ${
    mono ? "font-mono" : ""
  }${singleLine ? " overflow-x-auto whitespace-nowrap" : ""}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </label>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded border border-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        >
          {copyError ? copyError : copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
      {multiline ? (
        <textarea
          className={className}
          rows={rows}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : singleLine ? (
        <textarea
          className={`${className} resize-none`}
          rows={1}
          wrap="off"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <input
          className={className}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
}
