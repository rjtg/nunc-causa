"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuthStatus from "@/components/auth-status";

export default function TopBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const currentQuery = useMemo(
    () => searchParams.get("query") ?? "",
    [searchParams],
  );

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const isHotkey = (event.metaKey || event.ctrlKey) && event.key === "n";
      if (isHotkey) {
        event.preventDefault();
        router.push("/issues/new");
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [router]);

  return (
    <header className="border-b border-white/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tracking-tight">Causa</span>
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
            type="button"
          >
            Project: Alpha
          </button>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = query.trim();
              if (!trimmed) {
                router.push("/issues");
                return;
              }
              router.push(`/issues?query=${encodeURIComponent(trimmed)}`);
            }}
          >
            <input
              className="w-44 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm sm:w-56"
              placeholder="Search issues"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          <Link
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
            href="/issues/new"
          >
            New issue (⌘/Ctrl+N)
          </Link>
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
