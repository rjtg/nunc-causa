"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, username, ready } = useAuth();

  useEffect(() => {
    if (!ready) {
      return;
    }
    const isAuthed = Boolean(token || username);
    if (pathname === "/login") {
      return;
    }
    if (!isAuthed) {
      const query = searchParams.toString();
      const next = query ? `${pathname}?${query}` : pathname;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [pathname, ready, router, searchParams, token, username]);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Loading session…
      </div>
    );
  }

  return children;
}
