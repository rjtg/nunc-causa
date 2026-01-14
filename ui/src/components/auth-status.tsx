"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/context";

export default function AuthStatus() {
  const { token, baseUrl, ready, clear } = useAuth();

  if (!ready) {
    return (
      <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-sm">
        Loading…
      </span>
    );
  }

  if (!token) {
    return (
      <Link
        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
        href="/login"
      >
        Connect API
      </Link>
    );
  }

  return (
    <button
      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm"
      onClick={clear}
      type="button"
      title={baseUrl}
    >
      Connected
    </button>
  );
}
