"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { useHealth } from "@/lib/health/context";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";

type RuntimeEnvResponse = {
  label: string;
  profiles?: string[];
};

export default function HealthBanner() {
  const { baseUrl, token, username, password } = useAuth();
  const { online, lastCheckedAt, checkNow } = useHealth();
  const [env, setEnv] = useState<RuntimeEnvResponse | null>(null);
  const [reindexState, setReindexState] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");

  useEffect(() => {
    let active = true;
    async function loadEnv() {
      try {
        const response = await fetch(`${baseUrl}/actuator/runtime-env`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Unable to load env");
        }
        const data = (await response.json()) as RuntimeEnvResponse;
        if (!active) {
          return;
        }
        setEnv(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setEnv(null);
      }
    }
    loadEnv();
    return () => {
      active = false;
    };
  }, [baseUrl]);

  const reindex = async () => {
    setReindexState("running");
    try {
      const headers = new Headers();
      if (username && password && typeof btoa !== "undefined") {
        headers.set("Authorization", `Basic ${btoa(`${username}:${password}`)}`);
      } else if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const response = await fetch(`${baseUrl}/actuator/search-index`, {
        method: "POST",
        headers,
      });
      if (!response.ok) {
        throw new Error("Reindex failed");
      }
      setReindexState("done");
      setTimeout(() => setReindexState("idle"), 2000);
    } catch {
      setReindexState("error");
      setTimeout(() => setReindexState("idle"), 4000);
    }
  };

  const envLabel = env?.label ?? null;
  const showEnv = envLabel === "dev" || envLabel === "test";
  const envStyles =
    envLabel === "dev"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-sky-200 bg-sky-50 text-sky-800";
  const envBadgeStyles =
    envLabel === "dev"
      ? "border-amber-200 bg-amber-100 text-amber-700"
      : "border-sky-200 bg-sky-100 text-sky-700";

  if (!showEnv && online) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50">
      {showEnv && (
        <div className={`border-b px-5 py-2 text-xs ${envStyles}`}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <Icon name="comment" size={12} />
              Environment: {envLabel}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {env?.profiles && env.profiles.length > 0 && (
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${envBadgeStyles}`}
                >
                  {env.profiles.join(", ")}
                </span>
              )}
              {(token || username) && (
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
                  type="button"
                  disabled={reindexState === "running"}
                  onClick={reindex}
                >
                  <Icon name="reset" size={12} />
                  {reindexState === "running"
                    ? "Reindexing…"
                    : reindexState === "done"
                      ? "Reindexed"
                      : reindexState === "error"
                        ? "Reindex failed"
                      : "Reindex search"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {!online && (
        <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <Icon name="x" size={12} />
              Backend offline. Changes will retry when the API is back.
            </span>
            <Tooltip content={lastCheckedAt ?? undefined}>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700"
                type="button"
                onClick={checkNow}
              >
                <Icon name="reset" size={12} />
                Retry
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
