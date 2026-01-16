"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { useHealth } from "@/lib/health/context";
import { Icon } from "@/components/icons";
import { Typeahead } from "@/components/typeahead";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { IssueSummaryCard } from "@/components/issue-summary-card";

type ProjectSummary = {
  id: string;
  key: string;
  name: string;
  orgId: string;
  teamId: string;
  ownerId?: string | null;
  issueStatusCounts?: Record<string, number> | null;
  phaseStatusCounts?: Record<string, number> | null;
  phaseStatusByIssueStatus?: Record<string, Record<string, number>> | null;
};

type ProjectFacetOption = {
  id: string;
  count: number;
};

type ProjectFacetResponse = {
  owners: ProjectFacetOption[];
  teams: ProjectFacetOption[];
};

type UserOption = {
  id: string;
  displayName: string;
  openIssueCount?: number;
  openPhaseCount?: number;
  openTaskCount?: number;
};

type Filters = {
  query: string;
  ownerId: string;
  teamId: string;
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
  teamId: "",
};

const issueStatusOrder = [
  "IN_ANALYSIS",
  "IN_DEVELOPMENT",
  "IN_TEST",
  "IN_ROLLOUT",
  "NOT_ACTIVE",
  "DONE",
  "FAILED",
];

const phaseStatusOrder = ["DONE", "IN_PROGRESS", "FAILED", "NOT_STARTED"];

const issueStatusLabel = (value: string) => {
  if (value === "NOT_ACTIVE") {
    return "Not active";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const phaseStatusLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const issueStatusColor = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-rose-400";
    case "IN_DEVELOPMENT":
      return "bg-indigo-400";
    case "IN_TEST":
      return "bg-sky-400";
    case "IN_ROLLOUT":
      return "bg-violet-400";
    case "IN_ANALYSIS":
      return "bg-amber-400";
    case "NOT_ACTIVE":
      return "bg-slate-300";
    default:
      return "bg-slate-300";
  }
};

const phaseStatusColor = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-rose-400";
    case "IN_PROGRESS":
      return "bg-sky-400";
    case "NOT_STARTED":
      return "bg-slate-300";
    default:
      return "bg-slate-300";
  }
};

const userLabel = (users: UserOption[], userId?: string | null) => {
  if (!userId) {
    return "Unassigned";
  }
  return users.find((user) => user.id === userId)?.displayName ?? userId;
};

const projectProgressSegments = (project: ProjectSummary) => {
  const issueCounts = project.issueStatusCounts ?? {};
  const issueTotal = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
  if (issueTotal <= 0) {
    return [];
  }
  const phaseByIssue = project.phaseStatusByIssueStatus ?? {};
  return issueStatusOrder.flatMap((issueStatus, issueIndex) => {
    const issueCount = issueCounts[issueStatus] ?? 0;
    if (issueCount <= 0) {
      return [];
    }
    const phaseCounts = phaseByIssue[issueStatus] ?? {};
    const phaseTotal = Object.values(phaseCounts).reduce((sum, count) => sum + count, 0);
    const issueTooltip = (
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {issueStatusLabel(issueStatus)} · {issueCount} issues
        </p>
        {phaseTotal > 0 && (
          <div className="flex flex-wrap gap-1">
            {phaseStatusOrder
              .filter((status) => (phaseCounts[status] ?? 0) > 0)
              .map((status) => (
                <span
                  key={`${issueStatus}-${status}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                >
                  {phaseStatusLabel(status)} {phaseCounts[status]}
                </span>
              ))}
          </div>
        )}
      </div>
    );
    if (phaseTotal <= 0) {
      return [
        {
          color: issueStatusColor(issueStatus),
          count: issueCount,
          tooltip: issueTooltip,
          separator: issueIndex > 0,
        },
      ];
    }
    return phaseStatusOrder.flatMap((phaseStatus, phaseIndex) => {
      const phaseCount = phaseCounts[phaseStatus] ?? 0;
      if (phaseCount <= 0) {
        return [];
      }
      return [
        {
          color: phaseStatusColor(phaseStatus),
          count: issueCount * (phaseCount / phaseTotal),
          tooltip: issueTooltip,
          separator: issueIndex > 0 && phaseIndex === 0,
        },
      ];
    });
  });
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

export default function ProjectsPage() {
  const api = useApi();
  const searchParams = useSearchParams();
  const { token, username, ready } = useAuth();
  const { recoveries } = useHealth();
  const isAuthed = Boolean(token || username);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [facets, setFacets] = useState<ProjectFacetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facetError, setFacetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const queryFilters = useMemo(() => {
    const get = (key: keyof Filters) => searchParams.get(key) ?? "";
    return {
      query: get("query"),
      ownerId: get("ownerId"),
      teamId: get("teamId"),
    };
  }, [searchParams]);

  const [filterState, dispatch] = useReducer(
    filterReducer,
    queryFilters,
    (initial) => ({ filters: initial, appliedFilters: initial }),
  );

  const loadUsers = useCallback(async () => {
    if (!ready || !isAuthed) {
      return;
    }
    const { data, error: apiError } = await api.GET("/users", {
      params: { query: {} },
    });
    if (apiError) {
      setUsers([]);
      return;
    }
    setUsers(
      (data ?? []).map((user) => ({
        id: user.id ?? "unknown",
        displayName: user.displayName ?? "Unknown",
        openIssueCount: user.openIssueCount ?? 0,
        openPhaseCount: user.openPhaseCount ?? 0,
        openTaskCount: user.openTaskCount ?? 0,
      })),
    );
  }, [api, isAuthed, ready]);

  const loadProjects = useCallback(
    async (nextFilters: Filters) => {
      if (!isAuthed) {
        return;
      }
      setLoading(true);
      setError(null);
      const query = {
        q: nextFilters.query || undefined,
        ownerId: nextFilters.ownerId || undefined,
        teamId: nextFilters.teamId || undefined,
      };
      const { data, error: apiError } = await api.GET("/projects", {
        params: { query },
      });
      if (apiError || !data) {
        setError("Unable to load projects.");
        setLoading(false);
        return;
      }
      setProjects(
        data.map((project) => ({
          id: project.id ?? "unknown",
          key: project.key ?? "PROJECT",
          name: project.name ?? "Untitled",
          orgId: project.orgId ?? "unknown",
          teamId: project.teamId ?? "unknown",
          ownerId: project.ownerId ?? null,
          issueStatusCounts: project.issueStatusCounts ?? {},
          phaseStatusCounts: project.phaseStatusCounts ?? {},
          phaseStatusByIssueStatus: project.phaseStatusByIssueStatus ?? {},
        })),
      );
      setLoading(false);
    },
    [api, isAuthed],
  );

  const loadFacets = useCallback(
    async (nextFilters: Filters) => {
      if (!isAuthed) {
        return;
      }
      setFacetError(null);
      const query = {
        q: nextFilters.query || undefined,
        ownerId: nextFilters.ownerId || undefined,
        teamId: nextFilters.teamId || undefined,
      };
      const { data, error: apiError } = await api.GET("/projects/facets", {
        params: { query },
      });
      if (apiError || !data) {
        setFacetError("Unable to load facets.");
        setFacets(null);
        return;
      }
      setFacets(data as ProjectFacetResponse);
    },
    [api, isAuthed],
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
    void loadProjects(filterState.appliedFilters);
  }, [filterState.appliedFilters, isAuthed, loadProjects, ready, recoveries]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    void loadFacets(filterState.appliedFilters);
  }, [filterState.appliedFilters, isAuthed, loadFacets, ready, recoveries]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    void loadUsers();
  }, [isAuthed, loadUsers, ready, recoveries]);

  const ownerOptions = (facets?.owners ?? []).map((owner) => ({
    value: owner.id,
    label: userLabel(users, owner.id),
    meta: `${owner.count} projects`,
  }));

  const teamOptions = (facets?.teams ?? []).map((team) => ({
    value: team.id,
    label: team.id,
    meta: `${team.count} projects`,
  }));

  const updateProjectOwner = useCallback(
    async (projectId: string, ownerId: string | null) => {
      const { data, error: apiError } = await api.PATCH(
        "/projects/{projectId}/owner",
        {
          params: { path: { projectId } },
          body: { ownerId: ownerId ?? null },
        },
      );
      if (apiError || !data) {
        throw new Error("Unable to update owner.");
      }
      const updated = data as ProjectSummary;
      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, ownerId: updated.ownerId } : project,
        ),
      );
    },
    [api],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Projects
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Project portfolio
          </h1>
        </div>
      </header>

      {ready && !isAuthed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Sign in to browse projects.
        </div>
      )}

      {isAuthed && (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <form
            className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              dispatch({ type: "apply" });
            }}
          >
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Search
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={filterState.filters.query}
                  placeholder="Search by key or name"
                  onChange={(event) =>
                    dispatch({
                      type: "update",
                      payload: { query: event.target.value },
                    })
                  }
                />
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Owner
                <div className="mt-2">
                  <Typeahead
                    value={filterState.filters.ownerId}
                    onChange={(value) =>
                      dispatch({ type: "update", payload: { ownerId: value } })
                    }
                    options={ownerOptions}
                    placeholder="Owner"
                  />
                </div>
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Team
                <div className="mt-2">
                  <Typeahead
                    value={filterState.filters.teamId}
                    onChange={(value) =>
                      dispatch({ type: "update", payload: { teamId: value } })
                    }
                    options={teamOptions}
                    placeholder="Team"
                  />
                </div>
              </label>
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
              type="submit"
            >
              <Icon name="filter" size={12} />
              Apply filters
            </button>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
              type="button"
              onClick={() => dispatch({ type: "reset" })}
            >
              <Icon name="reset" size={12} />
              Reset
            </button>
          </form>

          <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
            {loading && <p className="text-sm text-slate-500">Loading projects…</p>}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            {facetError && (
              <p className="text-xs text-rose-600">{facetError}</p>
            )}
            {!loading && !error && projects.length === 0 && (
              <p className="text-sm text-slate-500">No projects found.</p>
            )}
            {projects.map((project) => (
              <IssueSummaryCard
                key={project.id}
                id={project.key}
                title={project.name}
                href={`/issues?projectId=${encodeURIComponent(project.id)}`}
                progressSegments={projectProgressSegments(project)}
                progressTotal={
                  Object.values(project.issueStatusCounts ?? {}).reduce(
                    (sum, count) => sum + count,
                    0,
                  ) || 1
                }
                right={
                  <UserBadgeSelect
                    value={project.ownerId}
                    users={users}
                    label="Owner"
                    ariaLabel="Change owner"
                    onRequestUsers={loadUsers}
                    onSave={(nextId) => updateProjectOwner(project.id, nextId)}
                  />
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
