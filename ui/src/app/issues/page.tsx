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

type UserOption = {
  id: string;
  displayName: string;
};

type ProjectOption = {
  id: string;
  name: string;
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
  const { token, username, ready } = useAuth();
  const isAuthed = Boolean(token || username);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<Filters>(emptyFilters);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
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
    if (!ready || !isAuthed) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIssues(appliedFilters);
  }, [appliedFilters, isAuthed, loadIssues, ready]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    let active = true;
    async function loadOptions() {
      setOptionsError(null);
      const [usersResponse, projectsResponse] = await Promise.all([
        api.GET("/users", { params: { query: {} } }),
        api.GET("/projects", { params: { query: {} } }),
      ]);
      if (!active) {
        return;
      }
      if (usersResponse.error || projectsResponse.error) {
        setOptionsError("Unable to load filter options.");
        return;
      }
      setUsers(
        (usersResponse.data ?? []).map((user) => ({
          id: user.id ?? "unknown",
          displayName: user.displayName ?? "Unknown",
        })),
      );
      setProjects(
        (projectsResponse.data ?? []).map((project) => ({
          id: project.id ?? "unknown",
          name: project.name ?? "Untitled",
        })),
      );
    }
    loadOptions();
    return () => {
      active = false;
    };
  }, [api, isAuthed, ready]);

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

      {!ready && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Loading session…
        </div>
      )}

      {ready && !isAuthed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Sign in to load issues.
        </div>
      )}

      <form
        className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedFilters(filters);
        }}
      >
        {optionsError && (
          <p className="text-xs text-rose-600">{optionsError}</p>
        )}
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
            placeholder="Search (title)"
            value={filters.query}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, query: event.target.value }))
            }
          />
          <div className="relative">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
              placeholder="Project"
              value={filters.projectId}
              list="project-options"
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, projectId: event.target.value }))
              }
            />
            <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
              ▾
            </span>
          </div>
          <div className="relative">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
              placeholder="Owner"
              value={filters.ownerId}
              list="user-options"
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, ownerId: event.target.value }))
              }
            />
            <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
              ▾
            </span>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div className="relative">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
              placeholder="Assignee"
              value={filters.assigneeId}
              list="user-options"
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  assigneeId: event.target.value,
                }))
              }
            />
            <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
              ▾
            </span>
          </div>
          <div className="relative">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
              placeholder="Member"
              value={filters.memberId}
              list="user-options"
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, memberId: event.target.value }))
              }
            />
            <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
              ▾
            </span>
          </div>
          <div className="relative">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
              placeholder="Phase kind"
              value={filters.phaseKind}
              list="phase-kind-options"
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  phaseKind: event.target.value,
                }))
              }
            />
            <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
              ▾
            </span>
          </div>
          <div className="relative">
            <input
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700"
              placeholder="Status"
              value={filters.status}
              list="issue-status-options"
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
            />
            <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
              ▾
            </span>
          </div>
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
        <datalist id="user-options">
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </datalist>
        <datalist id="project-options">
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </datalist>
        <datalist id="phase-kind-options">
          {[
            "INVESTIGATION",
            "PROPOSE_SOLUTION",
            "DEVELOPMENT",
            "ACCEPTANCE_TEST",
            "ROLLOUT",
          ].map((kind) => (
            <option key={kind} value={kind} />
          ))}
        </datalist>
        <datalist id="issue-status-options">
          {[
            "CREATED",
            "IN_ANALYSIS",
            "IN_DEVELOPMENT",
            "IN_TEST",
            "IN_ROLLOUT",
            "DONE",
            "FAILED",
          ].map((status) => (
            <option key={status} value={status} />
          ))}
        </datalist>
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
