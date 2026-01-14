"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";

type AuthMethod = {
  type: string;
  label: string;
  authorizeUrl?: string | null;
};

export default function LoginPage() {
  const router = useRouter();
  const {
    token,
    username,
    password,
    baseUrl,
    ready,
    setToken,
    setUsername,
    setPassword,
    setBaseUrl,
  } = useAuth();
  const [draftToken, setDraftToken] = useState(token ?? "");
  const [draftUsername, setDraftUsername] = useState(username ?? "dev");
  const [draftPassword, setDraftPassword] = useState(password ?? "dev");
  const [draftUrl, setDraftUrl] = useState(baseUrl);
  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [methodsError, setMethodsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadMethods() {
      setMethodsError(null);
      try {
        const response = await fetch(`${draftUrl}/auth/methods`);
        if (!response.ok) {
          throw new Error("Unable to fetch auth methods");
        }
        const payload = await response.json();
        if (active) {
          setMethods(payload.methods ?? []);
        }
      } catch {
        if (active) {
          setMethodsError("Unable to load auth methods.");
          setMethods([]);
        }
      }
    }
    if (ready) {
      loadMethods();
    }
    return () => {
      active = false;
    };
  }, [draftUrl, ready]);

  const supportsBasic = methods.some((method) => method.type === "basic");
  const oauthMethods = methods.filter((method) => method.type !== "basic");

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
          Use dev credentials (username/password) or a bearer token. Values are
          stored locally in your browser.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-4 text-sm text-slate-600">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Available login methods
        </p>
        {methodsError && (
          <p className="mt-2 text-xs text-rose-600">{methodsError}</p>
        )}
        {!methodsError && methods.length === 0 && (
          <p className="mt-2 text-xs text-slate-500">No methods reported.</p>
        )}
        {methods.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {methods.map((method) => (
              <span
                key={method.type}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
              >
                {method.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <form
        className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setToken(draftToken || null);
          setUsername(draftUsername || null);
          setPassword(draftPassword || null);
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
        {supportsBasic && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Username (basic auth)
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                value={draftUsername}
                onChange={(event) => setDraftUsername(event.target.value)}
                placeholder="dev"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Password
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
                value={draftPassword}
                onChange={(event) => setDraftPassword(event.target.value)}
                placeholder="dev"
                type="password"
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Bearer Token (optional)
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

      {oauthMethods.length > 0 && (
        <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            OAuth providers
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {oauthMethods.map((method) => (
              <a
                key={method.type}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                href={method.authorizeUrl ?? "#"}
              >
                {method.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
