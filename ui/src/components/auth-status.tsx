"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import { Icon } from "@/components/icons";

export default function AuthStatus() {
  const { token, username, baseUrl, ready, clear } = useAuth();

  if (!ready) {
    return (
      <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400 shadow-sm">
        Loading…
      </span>
    );
  }

  if (!token && !username) {
    return (
      <Link
        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
        href="/login"
      >
        <Icon name="arrow-right" size={12} />
        Login
      </Link>
    );
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm"
      onClick={clear}
      type="button"
      title={baseUrl}
    >
      <Icon name="arrow-left" size={12} />
      {username ? `Signed in: ${username}` : "Token active"}
    </button>
  );
}
