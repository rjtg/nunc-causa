"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

type IssueSummary = {
  id: string;
  title: string;
  ownerId: string;
  status: string;
  phaseCount: number;
};

export default function IssuesPage() {
  const api = useApi();
  const { token } = useAuth();
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await api.GET("/issues", {
        params: { query: {} },
      });
      if (!active) {
        return;
      }
      if (apiError || !data) {
        setError("Unable to load issues.");
        setLoading(false);
        return;
      }
      setIssues(
        data.map((issue) => ({
          id: issue.id ?? "unknown",
          title: issue.title ?? "Untitled",
          ownerId: issue.ownerId ?? "Unassigned",
          status: issue.status ?? "UNKNOWN",
          phaseCount: issue.phaseCount ?? 0,
        })),
      );
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [api, token]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Issues
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            All issues
          </h1>
        </div>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white">
          New issue
        </button>
      </header>

      {!token && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Connect your API token to load issues.
        </div>
      )}

      <div className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Owner"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Assignee"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Phase kind"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Status"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Project"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
        {loading && (
          <p className="text-sm text-slate-500">Loading issues…</p>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !error && issues.length === 0 && (
          <p className="text-sm text-slate-500">No issues found.</p>
        )}
        {issues.map((issue) => (
          <Link
            key={issue.id}
            href={`/issues/${issue.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200"
          >
            <div>
              <p className="text-xs text-slate-500">{issue.id}</p>
              <p className="text-sm font-semibold text-slate-900">
                {issue.title}
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <span>{issue.ownerId}</span>
              <span>{issue.status}</span>
              <span>{issue.phaseCount} phases</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
