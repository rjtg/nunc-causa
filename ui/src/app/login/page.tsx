"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth/context";

export default function LoginPage() {
  const router = useRouter();
  const { token, baseUrl, ready, setToken, setBaseUrl } = useAuth();
  const [draftToken, setDraftToken] = useState(token ?? "");
  const [draftUrl, setDraftUrl] = useState(baseUrl);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Loading session…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Connect
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Authenticate against the API
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Paste a dev token and API base URL. These are stored locally in your
          browser.
        </p>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setToken(draftToken || null);
          setBaseUrl(draftUrl);
          router.push("/issues");
        }}
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            API Base URL
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="http://localhost:8080"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Bearer Token
          </label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            placeholder="Paste token"
          />
        </div>
        <button className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white">
          Save connection
        </button>
      </form>
    </div>
  );
}
