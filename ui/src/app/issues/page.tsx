"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

type IssueSummary = {
  id: string;
  title: string;
  description?: string | null;
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

type FilterState = {
  filters: Filters;
  appliedFilters: Filters;
};

type FilterAction =
  | { type: "sync"; payload: Filters }
  | { type: "update"; payload: Partial<Filters> }
  | { type: "apply" }
  | { type: "reset" };

const emptyFilters: Filters = {
  query: "",
  ownerId: "",
  assigneeId: "",
  memberId: "",
  projectId: "",
  status: "",
  phaseKind: "",
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "sync":
      return { filters: action.payload, appliedFilters: action.payload };
    case "update":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case "apply":
      return { ...state, appliedFilters: state.filters };
    case "reset":
      return { filters: emptyFilters, appliedFilters: emptyFilters };
    default:
      return state;
  }
}

export default function IssuesPage() {
  const api = useApi();
  const searchParams = useSearchParams();
  const { token, username, ready } = useAuth();
  const isAuthed = Boolean(token || username);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadIssues = useCallback(
    async (nextFilters: Filters) => {
      if (!isAuthed) {
        return;
      }
      setLoading(true);
      setError(null);
      const query = {
        query: nextFilters.query || undefined,
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
          description: issue.description ?? null,
          ownerId: issue.ownerId ?? "Unassigned",
          status: issue.status ?? "UNKNOWN",
          phaseCount: issue.phaseCount ?? 0,
        })),
      );
      setLoading(false);
    },
    [api, isAuthed],
  );

  const queryFilters = useMemo(() => {
    const get = (key: keyof Filters) => searchParams.get(key) ?? "";
    return {
      query: get("query"),
      ownerId: get("ownerId"),
      assigneeId: get("assigneeId"),
      memberId: get("memberId"),
      projectId: get("projectId"),
      status: get("status"),
      phaseKind: get("phaseKind"),
    };
  }, [searchParams]);

  const [filterState, dispatch] = useReducer(
    filterReducer,
    queryFilters,
    (initial) => ({ filters: initial, appliedFilters: initial }),
  );

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    dispatch({ type: "sync", payload: queryFilters });
  }, [isAuthed, queryFilters, ready]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIssues(filterState.appliedFilters);
  }, [filterState.appliedFilters, isAuthed, loadIssues, ready]);

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
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Issues
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {filterState.appliedFilters.query
            ? `Search results for “${filterState.appliedFilters.query}”`
            : "All issues"}
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          {issues.length} results · refine with filters
        </p>
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

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <form
          className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            dispatch({ type: "apply" });
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Filters
            </h2>
            <button
              className="text-xs text-slate-500 underline-offset-2 hover:underline"
              type="button"
              onClick={() => dispatch({ type: "reset" })}
            >
              Reset
            </button>
          </div>
          {optionsError && (
            <p className="text-xs text-rose-600">{optionsError}</p>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Search
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              placeholder="Title or description"
              value={filterState.filters.query}
              onChange={(event) =>
                dispatch({ type: "update", payload: { query: event.target.value } })
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Project
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="Project"
                value={filterState.filters.projectId}
                list="project-options"
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    payload: { projectId: event.target.value },
                  })
                }
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Owner
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="Owner"
                value={filterState.filters.ownerId}
                list="user-options"
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    payload: { ownerId: event.target.value },
                  })
                }
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Assignee
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="Assignee"
                value={filterState.filters.assigneeId}
                list="user-options"
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    payload: { assigneeId: event.target.value },
                  })
                }
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Member
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="Member"
                value={filterState.filters.memberId}
                list="user-options"
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    payload: { memberId: event.target.value },
                  })
                }
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phase kind
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="Phase kind"
                value={filterState.filters.phaseKind}
                list="phase-kind-options"
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    payload: { phaseKind: event.target.value },
                  })
                }
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Status
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                placeholder="Status"
                value={filterState.filters.status}
                list="issue-status-options"
                onChange={(event) =>
                  dispatch({
                    type: "update",
                    payload: { status: event.target.value },
                  })
                }
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <button
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
            type="submit"
          >
            Apply filters
          </button>
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
            className="space-y-2 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200"
          >
            <div className="flex items-center justify-between">
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
            </div>
            {issue.description && (
              <p className="text-xs text-slate-500">
                {issue.description.length > 160
                  ? `${issue.description.slice(0, 160)}…`
                  : issue.description}
              </p>
            )}
          </Link>
        ))}
        </div>
      </div>
    </div>
  );
}
