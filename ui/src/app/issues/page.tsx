"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

type IssueSummary = {
  id: string;
  title: string;
  ownerId: string;
  status: string;
  phaseCount: number;
};

type Filters = {
  query: string;
  ownerId: string;
  assigneeId: string;
  memberId: string;
  projectId: string;
  status: string;
  phaseKind: string;
};

const emptyFilters: Filters = {
  query: "",
  ownerId: "",
  assigneeId: "",
  memberId: "",
  projectId: "",
  status: "",
  phaseKind: "",
};

export default function IssuesPage() {
  const api = useApi();
  const { token } = useAuth();
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(emptyFilters);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadIssues = useCallback(
    async (nextFilters: Filters) => {
      if (!token) {
        return;
      }
      setLoading(true);
      setError(null);
      const hasSearch = nextFilters.query.trim().length > 0;
      if (hasSearch) {
        const { data, error: apiError } = await api.GET("/search", {
          params: {
            query: {
              q: nextFilters.query,
              projectId: nextFilters.projectId || undefined,
            },
          },
        });
        if (apiError || !data) {
          setError("Unable to search issues.");
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
        return;
      }
      const query = {
        ownerId: nextFilters.ownerId || undefined,
        assigneeId: nextFilters.assigneeId || undefined,
        memberId: nextFilters.memberId || undefined,
        projectId: nextFilters.projectId || undefined,
        status: nextFilters.status || undefined,
        phaseKind: nextFilters.phaseKind || undefined,
      };
      const { data, error: apiError } = await api.GET("/issues", {
        params: { query },
      });
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
    },
    [api, token],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIssues(appliedFilters);
  }, [appliedFilters, loadIssues, token]);

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
        <Link
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
          href="/issues/new"
        >
          New issue
        </Link>
      </header>

      {!token && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Connect your API token to load issues.
        </div>
      )}

      <form
        className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedFilters(filters);
        }}
      >
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Search (title)"
            value={filters.query}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, query: event.target.value }))
            }
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Project"
            value={filters.projectId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, projectId: event.target.value }))
            }
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Owner"
            value={filters.ownerId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, ownerId: event.target.value }))
            }
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Assignee"
            value={filters.assigneeId}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                assigneeId: event.target.value,
              }))
            }
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Member"
            value={filters.memberId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, memberId: event.target.value }))
            }
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Phase kind"
            value={filters.phaseKind}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                phaseKind: event.target.value,
              }))
            }
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Status"
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, status: event.target.value }))
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
            type="submit"
          >
            Apply
          </button>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
            type="button"
            onClick={() => {
              setFilters(emptyFilters);
              setAppliedFilters(emptyFilters);
            }}
          >
            Reset
          </button>
        </div>
      </form>

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
