"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Generate" },
  { href: "/titles", label: "Titles" },
  { href: "/shop-data", label: "Shop data" },
  { href: "/history", label: "History" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") return null;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-semibold tracking-tight text-zinc-100">
            Motor Element
          </Link>
          <span className="font-mono text-xs text-zinc-500">Listing Studio</span>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="ml-2 rounded px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
