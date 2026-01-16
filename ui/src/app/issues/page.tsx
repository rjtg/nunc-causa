"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { Icon } from "@/components/icons";
import { Typeahead } from "@/components/typeahead";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { useHealth } from "@/lib/health/context";
import { IssueSummaryCard } from "@/components/issue-summary-card";

type IssueSummary = {
  id: string;
  title: string;
  description?: string | null;
  ownerId: string;
  status: string;
  deadline?: string | null;
  phaseCount: number;
  phaseStatusCounts?: Record<string, number> | null;
  phaseProgress?: {
    phaseId: string;
    phaseName: string;
    assigneeId: string;
    phaseKind?: string | null;
    deadline?: string | null;
    status: string;
    taskStatusCounts: Record<string, number>;
    taskTotal: number;
  }[];
};

type FacetOption = {
  id?: string | null;
  count?: number | null;
};

type FacetResponse = {
  owners: FacetOption[];
  assignees: FacetOption[];
  projects: FacetOption[];
  statuses: FacetOption[];
  phaseKinds: FacetOption[];
};

type UserOption = {
  id: string;
  displayName: string;
  openIssueCount?: number | null;
  openPhaseCount?: number | null;
  openTaskCount?: number | null;
};

const userLabel = (users: UserOption[], userId: string) => {
  return users.find((user) => user.id === userId)?.displayName ?? userId;
};

const isPastDeadline = (deadline?: string | null) => {
  if (!deadline) {
    return false;
  }
  const deadlineDate = new Date(`${deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate.getTime() < today.getTime();
};

const segmentColorHex = (status: string) => {
  switch (status) {
    case "DONE":
      return "#10b981";
    case "IN_PROGRESS":
      return "#38bdf8";
    case "PAUSED":
      return "#fbbf24";
    case "ABANDONED":
      return "#fb7185";
    case "FAILED":
      return "#fb7185";
    default:
      return "#cbd5e1";
  }
};

const segmentClass = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-rose-400";
    case "IN_PROGRESS":
      return "bg-sky-400";
    case "PAUSED":
      return "bg-amber-400";
    case "ABANDONED":
      return "bg-rose-400";
    default:
      return "bg-slate-300";
  }
};

const segmentStyle = (status: string, overdue: boolean) => {
  if (!overdue) {
    return { color: segmentClass(status) };
  }
  return {
    color: segmentClass(status),
    style: {
      outline: "2px dotted #ef4444",
      outlineOffset: "-1px",
      backgroundImage: `linear-gradient(90deg, #fecaca 0%, #fca5a5 60%, ${segmentColorHex(
        status,
      )} 100%)`,
    },
  };
};

const buildPhaseTaskSegments = (
  counts: Record<string, number>,
  overdue: boolean,
) => {
  return [
    { key: "DONE" },
    { key: "IN_PROGRESS" },
    { key: "PAUSED" },
    { key: "ABANDONED" },
    { key: "NOT_STARTED" },
  ]
    .map((segment) => {
      const count = counts[segment.key] ?? 0;
      if (count <= 0) {
        return null;
      }
      return {
        ...segmentStyle(segment.key, overdue),
        count,
      };
    })
    .filter(Boolean) as Array<ReturnType<typeof segmentStyle> & { count: number }>;
};

const issueOverdueClass = (status: string, deadline?: string | null) => {
  if (status === "DONE" || status === "FAILED") {
    return "";
  }
  if (!isPastDeadline(deadline)) {
    return "";
  }
  const tone = (() => {
    switch (status) {
      case "IN_ANALYSIS":
        return "to-amber-50";
      case "IN_DEVELOPMENT":
        return "to-sky-50";
      case "IN_TEST":
        return "to-violet-50";
      case "IN_ROLLOUT":
        return "to-emerald-50";
      default:
        return "to-slate-50";
    }
  })();
  return `border-rose-500/80 bg-gradient-to-r from-rose-200 via-rose-100 ${tone}`;
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

const workloadLabel = (user: UserOption) => {
  const openIssues = user.openIssueCount ?? 0;
  const openPhases = user.openPhaseCount ?? 0;
  const openTasks = user.openTaskCount ?? 0;
  return `${openIssues} / ${openPhases} / ${openTasks}`;
};

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

const issueStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "FAILED":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "IN_ANALYSIS":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "IN_DEVELOPMENT":
      return "border-sky-200 bg-sky-100 text-sky-800";
    case "IN_TEST":
      return "border-violet-200 bg-violet-100 text-violet-800";
    case "IN_ROLLOUT":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

const issueProgressTone = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-rose-500";
    case "IN_ANALYSIS":
      return "bg-amber-400";
    case "IN_DEVELOPMENT":
      return "bg-sky-400";
    case "IN_TEST":
      return "bg-violet-400";
    case "IN_ROLLOUT":
      return "bg-emerald-500";
    default:
      return "bg-slate-300";
  }
};

const issuePhaseSegments = (
  phases: IssueSummary["phaseProgress"],
  users: UserOption[],
  issueDeadline?: string | null,
) => {
  if (!phases || phases.length === 0) {
    return undefined;
  }
  const phaseOrder = [
    "INVESTIGATION",
    "PROPOSE_SOLUTION",
    "DEVELOPMENT",
    "ACCEPTANCE_TEST",
    "ROLLOUT",
  ];
  const sortedPhases = [...phases].sort((a, b) => {
    const orderA = phaseOrder.indexOf(a.phaseKind ?? "");
    const orderB = phaseOrder.indexOf(b.phaseKind ?? "");
    if (orderA === -1 && orderB === -1) {
      return a.phaseName.localeCompare(b.phaseName);
    }
    if (orderA === -1) {
      return 1;
    }
    if (orderB === -1) {
      return -1;
    }
    return orderA - orderB;
  });
  const phaseWeight = 1 / sortedPhases.length;
  return sortedPhases.flatMap((phase, phaseIndex) => {
    const tooltip = (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-800">{phase.phaseName}</p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-violet-700">
            {userLabel(users, phase.assigneeId)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            {phase.taskTotal} tasks
          </span>
          {phase.deadline && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-sky-700">
              Due {phase.deadline}
            </span>
          )}
        </div>
      </div>
    );
    const overdue =
      isPastDeadline(phase.deadline ?? issueDeadline ?? null) &&
      phase.status !== "DONE" &&
      phase.status !== "FAILED";
    if (!phase.taskTotal) {
      const phaseTone = overdue
        ? segmentStyle(phase.status, true)
        : { color: segmentClass(phase.status) };
      return [
        {
          color: phaseTone.color,
          style: phaseTone.style,
          count: phaseWeight,
          tooltip,
          separator: phaseIndex > 0,
        },
      ];
    }
    const counts = phase.taskStatusCounts ?? {};
    return [
      {
        color: "bg-transparent",
        count: phaseWeight,
        tooltip,
        separator: phaseIndex > 0,
        segments: buildPhaseTaskSegments(counts, overdue),
      },
    ];
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

export default function IssuesPage() {
  const api = useApi();
  const searchParams = useSearchParams();
  const { token, username, ready } = useAuth();
  const { recoveries } = useHealth();
  const isAuthed = Boolean(token || username);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [facetError, setFacetError] = useState<string | null>(null);
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const facetCounts = useMemo(() => {
    const counts = (options: FacetOption[]) =>
      options.reduce<Record<string, number>>((acc, option) => {
        if (option.id) {
          acc[option.id] = option.count ?? 0;
        }
        return acc;
      }, {});
    return {
      owners: counts(facets?.owners ?? []),
      assignees: counts(facets?.assignees ?? []),
      projects: counts(facets?.projects ?? []),
    };
  }, [facets]);

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
          deadline: issue.deadline ?? null,
          phaseCount: issue.phaseCount ?? 0,
          phaseStatusCounts: issue.phaseStatusCounts ?? null,
          phaseProgress: issue.phaseProgress ?? [],
        })),
      );
      setLoading(false);
    },
    [api, isAuthed],
  );

  const updateIssueOwner = useCallback(
    async (issueId: string, ownerId: string | null) => {
      if (!ownerId) {
        throw new Error("Owner is required.");
      }
      const { data, error: apiError } = await api.PATCH("/issues/{issueId}/owner", {
        params: { path: { issueId } },
        body: { ownerId },
      });
      if (apiError || !data) {
        throw new Error("Unable to update owner.");
      }
      const updated = data as { id?: string; ownerId?: string };
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                ownerId: updated.ownerId ?? issue.ownerId,
              }
            : issue,
        ),
      );
    },
    [api],
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
  }, [filterState.appliedFilters, isAuthed, loadIssues, ready, recoveries]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    let active = true;
    async function loadFacets() {
      setFacetError(null);
      const query = {
        query: filterState.appliedFilters.query || undefined,
        ownerId: filterState.appliedFilters.ownerId || undefined,
        assigneeId: filterState.appliedFilters.assigneeId || undefined,
        memberId: filterState.appliedFilters.memberId || undefined,
        projectId: filterState.appliedFilters.projectId || undefined,
        status: filterState.appliedFilters.status || undefined,
        phaseKind: filterState.appliedFilters.phaseKind || undefined,
      };
      const { data, error: apiError } = await api.GET("/issues/facets", {
        params: { query },
      });
      if (!active) {
        return;
      }
      if (apiError || !data) {
        setFacetError("Unable to load facets.");
        setFacets(null);
        return;
      }
      setFacets(data as FacetResponse);
    }
    loadFacets();
    return () => {
      active = false;
    };
  }, [api, filterState.appliedFilters, isAuthed, ready, recoveries]);

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
          openIssueCount: user.openIssueCount ?? 0,
          openPhaseCount: user.openPhaseCount ?? 0,
          openTaskCount: user.openTaskCount ?? 0,
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
  }, [api, isAuthed, ready, recoveries]);

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
              className="inline-flex items-center gap-2 text-xs text-slate-500 underline-offset-2 hover:underline"
              type="button"
              onClick={() => dispatch({ type: "reset" })}
            >
              <Icon name="reset" size={12} />
              Reset
            </button>
          </div>
          {(optionsError || facetError) && (
            <p className="text-xs text-rose-600">
              {optionsError ?? facetError}
            </p>
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
            <Typeahead
              value={filterState.filters.projectId}
              onChange={(value) =>
                dispatch({ type: "update", payload: { projectId: value } })
              }
              options={projects
                .filter((project) => {
                  if (!facets) {
                    return true;
                  }
                  const validIds = new Set(
                    facets.projects
                      .map((option) => option.id)
                      .filter(Boolean) as string[],
                  );
                  return validIds.size === 0 || validIds.has(project.id);
                })
                .map((project) => ({
                  value: project.id,
                  label: project.name,
                  meta:
                    facetCounts.projects[project.id] !== undefined
                      ? `${facetCounts.projects[project.id]} open`
                      : undefined,
                }))}
              placeholder="Project"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Owner
            </label>
            <Typeahead
              value={filterState.filters.ownerId}
              onChange={(value) =>
                dispatch({ type: "update", payload: { ownerId: value } })
              }
              options={users
                .filter((user) => {
                  if (!facets) {
                    return true;
                  }
                  const validIds = new Set(
                    facets.owners
                      .map((option) => option.id)
                      .filter(Boolean) as string[],
                  );
                  return validIds.size === 0 || validIds.has(user.id);
                })
                .map((user) => ({
                  value: user.id,
                  label: user.displayName,
                  meta: workloadLabel(user),
                }))}
              placeholder="Owner"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Assignee
            </label>
            <Typeahead
              value={filterState.filters.assigneeId}
              onChange={(value) =>
                dispatch({ type: "update", payload: { assigneeId: value } })
              }
              options={users
                .filter((user) => {
                  if (!facets) {
                    return true;
                  }
                  const validIds = new Set(
                    facets.assignees
                      .map((option) => option.id)
                      .filter(Boolean) as string[],
                  );
                  return validIds.size === 0 || validIds.has(user.id);
                })
                .map((user) => ({
                  value: user.id,
                  label: user.displayName,
                  meta: workloadLabel(user),
                }))}
              placeholder="Assignee"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Member
            </label>
            <Typeahead
              value={filterState.filters.memberId}
              onChange={(value) =>
                dispatch({ type: "update", payload: { memberId: value } })
              }
              options={users
                .filter((user) => {
                  if (!facets) {
                    return true;
                  }
                  const validIds = new Set(
                    [...facets.owners, ...facets.assignees]
                      .map((option) => option.id)
                      .filter(Boolean) as string[],
                  );
                  return validIds.size === 0 || validIds.has(user.id);
                })
                .map((user) => ({
                  value: user.id,
                  label: user.displayName,
                  meta: workloadLabel(user),
                }))}
              placeholder="Member"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Phase kind
            </label>
            <Typeahead
              value={filterState.filters.phaseKind}
              onChange={(value) =>
                dispatch({ type: "update", payload: { phaseKind: value } })
              }
              options={(facets?.phaseKinds ?? [
                { id: "INVESTIGATION" },
                { id: "PROPOSE_SOLUTION" },
                { id: "DEVELOPMENT" },
                { id: "ACCEPTANCE_TEST" },
                { id: "ROLLOUT" },
              ])
                .map((option) => option.id)
                .filter(Boolean)
                .map((kind) => ({
                  value: kind as string,
                }))}
              placeholder="Phase kind"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Status
            </label>
            <Typeahead
              value={filterState.filters.status}
              onChange={(value) =>
                dispatch({ type: "update", payload: { status: value } })
              }
              options={(facets?.statuses ?? [
                { id: "CREATED" },
                { id: "NOT_ACTIVE" },
                { id: "IN_ANALYSIS" },
                { id: "IN_DEVELOPMENT" },
                { id: "IN_TEST" },
                { id: "IN_ROLLOUT" },
                { id: "DONE" },
                { id: "FAILED" },
              ])
                .map((option) => option.id)
                .filter(Boolean)
                .map((status) => ({
                  value: status as string,
                  label: issueStatusLabel(status as string),
                }))}
              placeholder="Status"
            />
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
            type="submit"
          >
            <Icon name="filter" size={12} />
            Apply filters
          </button>
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
          <IssueSummaryCard
            key={issue.id}
            id={issue.id}
            title={issue.title ?? issue.id}
            href={`/issues/${issue.id}`}
            className={issueOverdueClass(issue.status, issue.deadline)}
            progressSegments={issuePhaseSegments(issue.phaseProgress, users, issue.deadline)}
            progressTotal={1}
            progressTone={
              issue.phaseCount > 0 ? undefined : issueProgressTone(issue.status)
            }
            description={
              issue.description
                ? issue.description.length > 160
                  ? `${issue.description.slice(0, 160)}…`
                  : issue.description
                : undefined
            }
            right={
              <>
                <UserBadgeSelect
                  value={issue.ownerId}
                  users={users}
                  label="Owner"
                  ariaLabel="Change owner"
                  onRequestUsers={async () => {
                    if (!ready || !isAuthed) {
                      return;
                    }
                    const { data, error: apiError } = await api.GET("/users", {
                      params: { query: {} },
                    });
                    if (apiError) {
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
                  }}
                  onSave={(nextId) => updateIssueOwner(issue.id, nextId)}
                />
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${issueStatusBadgeStyle(
                    issue.status,
                  )}`}
                >
                  {issueStatusLabel(issue.status)}
                </span>
              </>
            }
          />
        ))}
        </div>
      </div>
    </div>
  );
}
