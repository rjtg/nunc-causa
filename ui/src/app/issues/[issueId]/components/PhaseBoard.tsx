"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";
import Link from "next/link";
import type { IssueDetail, Phase, Task, UserOption } from "../types";
import type { ReactNode } from "react";
import type { createApiClient } from "@/lib/api/client";

type ApiClient = ReturnType<typeof createApiClient>;

type TaskDraft = {
  title: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  dependencies: { type: string; targetId: string }[];
  saving: boolean;
  error: string | null;
};

type CompletionDraft = {
  comment: string;
  artifactUrl: string;
  saving: boolean;
  error: string | null;
  pendingStatus?: string | null;
};

type IssueSummary = {
  id: string;
  title: string;
  description?: string | null;
};

type DependencySearchState = {
  query: string;
  results: IssueSummary[];
  loading: boolean;
  error: string | null;
  expandedIssues: string[];
  expandedPhases: Record<string, string[]>;
};

type PhaseBoardProps = {
  issueId: string;
  issue: IssueDetail;
  api: ApiClient;
  users: UserOption[];
  onIssueUpdate: (issue: IssueDetail) => void;
  onDeadlineImpact?: (before: IssueDetail, after: IssueDetail) => void;
};

const phaseOrder = [
  "INVESTIGATION",
  "PROPOSE_SOLUTION",
  "DEVELOPMENT",
  "ACCEPTANCE_TEST",
  "ROLLOUT",
];

const phaseStatuses = ["NOT_STARTED", "IN_PROGRESS", "DONE", "FAILED"];
const taskStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PAUSED",
  "ABANDONED",
  "DONE",
];

const taskStatusStyle = (status: string) => {
  switch (status) {
    case "DONE":
      return "border-emerald-100 bg-emerald-50";
    case "IN_PROGRESS":
      return "border-sky-100 bg-sky-50";
    case "PAUSED":
      return "border-amber-100 bg-amber-50";
    case "ABANDONED":
      return "border-rose-100 bg-rose-50";
    default:
      return "border-slate-100 bg-white";
  }
};

const phaseStatusStyle = (status: string) => {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "IN_PROGRESS":
      return "border-sky-200 bg-sky-100 text-sky-800";
    case "FAILED":
      return "border-rose-200 bg-rose-100 text-rose-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

const issueStatusStyle = (status: string) => phaseStatusStyle(status);

const issueProgressBarStyle = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "IN_PROGRESS":
      return "bg-sky-500";
    case "FAILED":
      return "bg-rose-500";
    default:
      return "bg-slate-300";
  }
};

const statusSeverityOrder: Record<string, number> = {
  FAILED: 5,
  ABANDONED: 4,
  PAUSED: 3,
  IN_PROGRESS: 2,
  NOT_STARTED: 1,
  DONE: 0,
};

const worstStatus = (statuses: Array<string | null | undefined>) => {
  let worst: string | null = null;
  let worstScore = -1;
  statuses.forEach((status) => {
    if (!status) {
      return;
    }
    const score = statusSeverityOrder[status] ?? -1;
    if (score > worstScore) {
      worstScore = score;
      worst = status;
    }
  });
  return worst;
};

const isDateRangeValid = (startDate?: string, dueDate?: string) => {
  if (!startDate || !dueDate) {
    return true;
  }
  const start = new Date(startDate);
  const due = new Date(dueDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
    return true;
  }
  return due.getTime() >= start.getTime();
};

const minIsoDate = (...dates: Array<string | null | undefined>) => {
  const valid = dates.filter((date): date is string => Boolean(date));
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((min, current) => {
    return new Date(current).getTime() < new Date(min).getTime() ? current : min;
  });
};

const isOnOrBefore = (value?: string | null, limit?: string | null) => {
  if (!value || !limit) {
    return true;
  }
  const valueDate = new Date(value);
  const limitDate = new Date(limit);
  if (Number.isNaN(valueDate.getTime()) || Number.isNaN(limitDate.getTime())) {
    return true;
  }
  return valueDate.getTime() <= limitDate.getTime();
};

const phaseProgress = (tasks: Task[]) => {
  const total = tasks.length || 0;
  const counts = tasks.reduce(
    (acc, task) => {
      acc.total += 1;
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      PAUSED: 0,
      ABANDONED: 0,
      DONE: 0,
    } as Record<string, number>,
  );
  return { total, counts };
};

const statusLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const phaseLabel = (phase: Phase) => {
  if (phase.kind) {
    return (
      {
        INVESTIGATION: "Investigation",
        PROPOSE_SOLUTION: "Propose solution",
        DEVELOPMENT: "Development",
        ACCEPTANCE_TEST: "Acceptance test",
        ROLLOUT: "Rollout",
      } as Record<string, string>
    )[phase.kind] ?? phase.name;
  }
  return phase.name;
};

const createDependencyState = (): DependencySearchState => ({
  query: "",
  results: [],
  loading: false,
  error: null,
  expandedIssues: [],
  expandedPhases: {},
});

const DependencyBadge = ({
  label,
  tooltip,
  style,
  onRemove,
  href,
}: {
  label: string;
  tooltip: ReactNode;
  style: string;
  onRemove: () => void;
  href?: string;
}) => {
  const Wrapper: typeof Link | "span" = href ? Link : "span";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1 ${style}`}
    >
      <Icon name="link" size={12} />
      <span className="text-[11px]">{label}</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max max-w-[240px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {tooltip}
      </span>
      <button
        className="inline-flex items-center"
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        aria-label="Remove dependency"
      >
        <Icon name="x" size={12} />
      </button>
    </Wrapper>
  );
};

const DependencyPicker = ({
  issue,
  dependencyIssues,
  state,
  setState,
  onSearch,
  ensureIssueDetail,
  onAdd,
}: {
  issue: IssueDetail;
  dependencyIssues: Record<string, IssueDetail>;
  state: DependencySearchState;
  setState: (updater: (current: DependencySearchState) => DependencySearchState) => void;
  onSearch: (query: string) => void;
  ensureIssueDetail: (issueId: string) => Promise<IssueDetail | null>;
  onAdd: (dep: { type: string; targetId: string }) => void;
}) => {
  const currentIssueSummary = {
    id: issue.id,
    title: issue.title,
    description: issue.description ?? null,
  };
  const results = state.query.trim().length > 0 ? state.results : [];
  const visibleResults = results.filter((result) => result.id !== issue.id);
  const issuesToShow = [currentIssueSummary, ...visibleResults];

  const issueTooltip = (detail: IssueDetail | null, fallback: IssueSummary) => {
    if (!detail) {
      return fallback.title;
    }
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-800">{detail.title}</p>
        {detail.deadline && (
          <div className="text-[11px] text-slate-600">
            — → {detail.deadline}
          </div>
        )}
        {detail.phases.length > 0 && (
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className={`h-1.5 rounded-full ${issueProgressBarStyle(detail.status)}`}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    );
  };

  const isIssueExpanded = (issueId: string) =>
    state.expandedIssues.includes(issueId);

  const isPhaseExpanded = (issueId: string, phaseId: string) =>
    state.expandedPhases[issueId]?.includes(phaseId) ?? false;

  const toggleIssue = async (issueId: string) => {
    const isExpanded = isIssueExpanded(issueId);
    setState((current) => ({
      ...current,
      expandedIssues: isExpanded
        ? current.expandedIssues.filter((id) => id !== issueId)
        : [...current.expandedIssues, issueId],
    }));
    if (!isExpanded && issueId !== issue.id) {
      await ensureIssueDetail(issueId);
    }
  };

  const togglePhase = (issueId: string, phaseId: string) => {
    setState((current) => {
      const currentExpanded = current.expandedPhases[issueId] ?? [];
      const nextExpanded = currentExpanded.includes(phaseId)
        ? currentExpanded.filter((id) => id !== phaseId)
        : [...currentExpanded, phaseId];
      return {
        ...current,
        expandedPhases: {
          ...current.expandedPhases,
          [issueId]: nextExpanded,
        },
      };
    });
  };

  const renderIssueDetail = (detail: IssueDetail) => {
    if (detail.phases.length === 0) {
      return (
        <p className="text-[11px] text-slate-400">No phases available.</p>
      );
    }
    return (
      <div className="mt-2 space-y-2">
        {detail.phases.map((phase) => (
          <div
            key={phase.id}
            className="rounded-lg border border-slate-100 bg-white px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {phaseLabel(phase)}
                </p>
                <p className="text-[11px] text-slate-500">Phase {phase.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                  type="button"
                  onClick={() => onAdd({ type: "PHASE", targetId: phase.id })}
                >
                  <Icon name="plus" size={12} />
                  Use phase
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                  type="button"
                  onClick={() => togglePhase(detail.id, phase.id)}
                >
                  <Icon
                    name={
                      isPhaseExpanded(detail.id, phase.id)
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={12}
                  />
                  Tasks
                </button>
              </div>
            </div>
            {isPhaseExpanded(detail.id, phase.id) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {phase.tasks.map((task) => (
                  <button
                    key={task.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                    type="button"
                    onClick={() => onAdd({ type: "TASK", targetId: task.id })}
                  >
                    <Icon name="plus" size={12} />
                    {task.title}
                  </button>
                ))}
                {phase.tasks.length === 0 && (
                  <span className="text-[11px] text-slate-400">
                    No tasks yet.
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-2 space-y-2">
      <input
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
        placeholder="Search issues"
        value={state.query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setState((current) => ({ ...current, query: nextQuery }));
          onSearch(nextQuery);
        }}
      />
      {state.loading && <p className="text-xs text-slate-400">Searching…</p>}
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      <div className="space-y-2">
          {issuesToShow.map((summary, index) => {
            const isCurrent = summary.id === issue.id;
            const detail = isCurrent ? issue : dependencyIssues[summary.id];
            return (
            <div
              key={summary.id}
              className={`rounded-lg border px-3 py-2 ${
                isCurrent
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              {isCurrent && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Current issue
                </p>
              )}
              {!isCurrent && index === 0 && state.query.trim().length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Search results
                </p>
              )}
              <div className="mt-1 flex items-center justify-between gap-3">
                <Tooltip content={issueTooltip(detail ?? null, summary)}>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {summary.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{summary.id}</p>
                  </div>
                </Tooltip>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                    type="button"
                    onClick={() => onAdd({ type: "ISSUE", targetId: summary.id })}
                  >
                    <Icon name="link" size={12} />
                    Use issue
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                    type="button"
                    onClick={() => void toggleIssue(summary.id)}
                  >
                    <Icon
                      name={isIssueExpanded(summary.id) ? "chevron-up" : "chevron-down"}
                      size={12}
                    />
                    {isIssueExpanded(summary.id) ? "Hide" : "Expand"}
                  </button>
                </div>
              </div>
              {isIssueExpanded(summary.id) && detail && renderIssueDetail(detail)}
              {isIssueExpanded(summary.id) && !detail && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Loading issue details…
                </p>
              )}
            </div>
          );
        })}
        {issuesToShow.length === 1 && state.query.trim().length > 0 && (
          <p className="text-xs text-slate-400">No matching issues.</p>
        )}
      </div>
    </div>
  );
};

export function PhaseBoard({
  issueId,
  issue,
  api,
  users,
  onIssueUpdate,
  onDeadlineImpact,
}: PhaseBoardProps) {
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
  const [openTaskDatePopover, setOpenTaskDatePopover] = useState<string | null>(null);
  const [openTaskDependencyPopover, setOpenTaskDependencyPopover] = useState<string | null>(null);
  const [openTaskAssigneePopover, setOpenTaskAssigneePopover] = useState<string | null>(null);
  const [taskMetaDrafts, setTaskMetaDrafts] = useState<
    Record<
      string,
      {
        startDate: string;
        dueDate: string;
        assigneeId: string;
        dependencies: { type: string; targetId: string }[];
      }
    >
  >({});
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, CompletionDraft>>({});
  const [phaseStatusSaving, setPhaseStatusSaving] = useState<Record<string, boolean>>({});
  const [taskStatusSaving, setTaskStatusSaving] = useState<Record<string, boolean>>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [openPhaseDeadlinePopover, setOpenPhaseDeadlinePopover] = useState<string | null>(null);
  const [phaseDeadlineDrafts, setPhaseDeadlineDrafts] = useState<Record<string, string>>({});
  const [dependencySearch, setDependencySearch] = useState<Record<string, DependencySearchState>>({});
  const [dependencyIssues, setDependencyIssues] = useState<Record<string, IssueDetail>>({});

  const allIssues = [issue, ...Object.values(dependencyIssues)];
  const dependencyIndex = allIssues.reduce(
    (acc, currentIssue) => {
      acc.issueById[currentIssue.id] = currentIssue;
      currentIssue.phases.forEach((phase) => {
        acc.phaseById[phase.id] = phase;
        acc.issueForPhase[phase.id] = currentIssue.id;
        phase.tasks.forEach((task) => {
          acc.taskById[task.id] = task;
          acc.issueForTask[task.id] = currentIssue.id;
          acc.phaseForTask[task.id] = phase.id;
        });
      });
      return acc;
    },
    {
      issueById: {} as Record<string, IssueDetail>,
      phaseById: {} as Record<string, Phase>,
      taskById: {} as Record<string, Task>,
      issueForPhase: {} as Record<string, string>,
      issueForTask: {} as Record<string, string>,
      phaseForTask: {} as Record<string, string>,
    },
  );

  const userLabel = (userId?: string | null) => {
    if (!userId) {
      return "Unassigned";
    }
    return users.find((user) => user.id === userId)?.displayName ?? userId;
  };

  const getTaskDraft = (phaseId: string): TaskDraft =>
    taskDrafts[phaseId] ?? {
      title: "",
      assigneeId: "",
      startDate: "",
      dueDate: "",
      dependencies: [],
      saving: false,
      error: null,
    };

  const updateTaskDraft = (phaseId: string, next: Partial<TaskDraft>) => {
    setTaskDrafts((prev) => ({
      ...prev,
      [phaseId]: {
        ...getTaskDraft(phaseId),
        ...next,
      },
    }));
  };

  const getTaskMetaDraft = (task: Task) =>
    taskMetaDrafts[task.id] ?? {
      startDate: task.startDate ?? "",
      dueDate: task.dueDate ?? "",
      assigneeId: task.assigneeId ?? "",
      dependencies:
        task.dependencies?.map((dep) => ({
          type: dep.type ?? "TASK",
          targetId: dep.targetId ?? "",
        })) ?? [],
    };

  const updateTaskMetaDraft = (
    task: Task,
    next: Partial<{
      startDate: string;
      dueDate: string;
      assigneeId: string;
      dependencies: { type: string; targetId: string }[];
    }>,
  ) => {
    setTaskMetaDrafts((prev) => ({
      ...prev,
      [task.id]: {
        ...getTaskMetaDraft(task),
        ...prev[task.id],
        ...next,
      },
    }));
  };

  const getCompletionDraft = (phase: Phase): CompletionDraft =>
    completionDrafts[phase.id] ?? {
      comment: phase.completionComment ?? "",
      artifactUrl: phase.completionArtifactUrl ?? "",
      saving: false,
      error: null,
      pendingStatus: null,
    };

  const updateCompletionDraft = (phaseId: string, next: Partial<CompletionDraft>) => {
    setCompletionDrafts((prev) => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        comment: prev[phaseId]?.comment ?? "",
        artifactUrl: prev[phaseId]?.artifactUrl ?? "",
        saving: prev[phaseId]?.saving ?? false,
        error: prev[phaseId]?.error ?? null,
        pendingStatus: prev[phaseId]?.pendingStatus ?? null,
        ...next,
      },
    }));
  };

  const getPhaseDeadlineDraft = (phase: Phase) =>
    phaseDeadlineDrafts[phase.id] ?? phase.deadline ?? "";

  const updatePhaseDeadlineDraft = (phaseId: string, deadline: string) => {
    setPhaseDeadlineDrafts((prev) => ({
      ...prev,
      [phaseId]: deadline,
    }));
  };

  const getDependencyState = (key: string) =>
    dependencySearch[key] ?? createDependencyState();

  const setDependencyState = (
    key: string,
    updater: (current: DependencySearchState) => DependencySearchState,
  ) => {
    setDependencySearch((prev) => {
      const current = prev[key] ?? createDependencyState();
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  const updateDependencyState = (key: string, next: Partial<DependencySearchState>) => {
    setDependencyState(key, (current) => ({
      ...current,
      ...next,
    }));
  };

  const searchIssues = async (key: string, query: string) => {
    if (query.trim().length < 2) {
      updateDependencyState(key, {
        query,
        results: [],
        loading: false,
        error: null,
      });
      return;
    }
    updateDependencyState(key, { query, loading: true, error: null });
    const { data, error } = await api.GET("/search", {
      params: {
        query: {
          q: query,
          projectId: issue.projectId ?? undefined,
        },
      },
    });
    if (error) {
      updateDependencyState(key, {
        query,
        loading: false,
        error: "Unable to search issues.",
      });
      return;
    }
    const results = (data ?? []).map((item) => ({
      id: item.id ?? "unknown",
      title: item.title ?? "Untitled",
      description: item.description ?? null,
    }));
    updateDependencyState(key, { query, results, loading: false, error: null });
  };

  const ensureIssueDetail = async (issueId: string) => {
    if (dependencyIssues[issueId]) {
      return dependencyIssues[issueId];
    }
    const { data, error } = await api.GET("/issues/{issueId}", {
      params: { path: { issueId } },
    });
    if (!error && data) {
      const detail = data as IssueDetail;
      setDependencyIssues((prev) => ({ ...prev, [issueId]: detail }));
      return detail;
    }
    return null;
  };

  const addDependencyForTask = (task: Task, dep: { type: string; targetId: string }) => {
    const nextDeps = [...getTaskMetaDraft(task).dependencies, dep];
    updateTaskMetaDraft(task, { dependencies: nextDeps });
  };

  const addDependencyForDraft = (phaseId: string, dep: { type: string; targetId: string }) => {
    const draft = getTaskDraft(phaseId);
    updateTaskDraft(phaseId, {
      dependencies: [...draft.dependencies, dep],
    });
  };

  useEffect(() => {
    const issueDeps = new Set<string>();
    issue.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        task.dependencies?.forEach((dep) => {
          if ((dep.type ?? "TASK") === "ISSUE" && dep.targetId) {
            issueDeps.add(dep.targetId);
          }
        });
      });
    });
    issueDeps.forEach((depIssueId) => {
      if (!dependencyIssues[depIssueId]) {
        void ensureIssueDetail(depIssueId);
      }
    });
  }, [issue, dependencyIssues]);

  const dependencyBadgeStyle = (kind: string, status?: string | null) => {
    if (!status) {
      return "border-slate-200 bg-white text-slate-600";
    }
    if (kind === "TASK") {
      return `${taskStatusStyle(status)} text-slate-700`;
    }
    return issueStatusStyle(status);
  };

  const dependencyStatus = (dep: { type?: string | null; targetId?: string | null }) => {
    const type = dep.type ?? "TASK";
    const targetId = dep.targetId ?? "";
    if (type === "ISSUE") {
      return dependencyIndex.issueById[targetId]?.status ?? null;
    }
    if (type === "PHASE") {
      return dependencyIndex.phaseById[targetId]?.status ?? null;
    }
    return dependencyIndex.taskById[targetId]?.status ?? null;
  };

  const dependencyHref = (dep: { type?: string | null; targetId?: string | null }) => {
    const type = dep.type ?? "TASK";
    const targetId = dep.targetId ?? "";
    if (type === "ISSUE") {
      return `/issues/${targetId}`;
    }
    if (type === "PHASE") {
      const issueId = dependencyIndex.issueForPhase[targetId];
      return issueId ? `/issues/${issueId}` : undefined;
    }
    const issueId = dependencyIndex.issueForTask[targetId];
    return issueId ? `/issues/${issueId}` : undefined;
  };

  const formatDependency = (dep: { type?: string | null; targetId?: string | null }) => {
    const type = dep.type ?? "TASK";
    const targetId = dep.targetId ?? "unknown";
    if (type === "ISSUE") {
      const issueDetail = dependencyIndex.issueById[targetId];
      if (!issueDetail) {
        return {
          label: targetId,
          tooltip: `Issue ${targetId}`,
          style: dependencyBadgeStyle(type, null),
        };
      }
      return {
        label: issueDetail.id,
        tooltip: (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              {issueDetail.title}
            </p>
            {issueDetail.deadline && (
              <div className="text-[11px] text-slate-600">
                — → {issueDetail.deadline}
              </div>
            )}
            {issueDetail.phases.length > 0 && (
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${issueProgressBarStyle(
                    issueDetail.status,
                  )}`}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        ),
        style: dependencyBadgeStyle(type, issueDetail.status),
      };
    }
    if (type === "PHASE") {
      const phase = dependencyIndex.phaseById[targetId];
      if (!phase) {
        return {
          label: `phase:${targetId}`,
          tooltip: `Phase ${targetId}`,
          style: dependencyBadgeStyle(type, null),
        };
      }
      const issueKey = dependencyIndex.issueForPhase[targetId] ?? "issue";
      return {
        label: `${issueKey}:${phaseLabel(phase)}`,
        tooltip: (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              {phaseLabel(phase)}
            </p>
            {phase.deadline && (
              <div className="text-[11px] text-slate-600">
                — → {phase.deadline}
              </div>
            )}
            {phase.tasks.length > 0 && (
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${issueProgressBarStyle(
                    phase.status,
                  )}`}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        ),
        style: dependencyBadgeStyle(type, phase.status),
      };
    }
    const task = dependencyIndex.taskById[targetId];
    if (!task) {
      return {
        label: `task:${targetId}`,
        tooltip: `Task ${targetId}`,
        style: dependencyBadgeStyle(type, null),
      };
    }
    const issueKey = dependencyIndex.issueForTask[targetId] ?? "issue";
    const phaseId = dependencyIndex.phaseForTask[targetId];
    const phase = phaseId ? dependencyIndex.phaseById[phaseId] : null;
    const phaseName = phase ? phaseLabel(phase) : "phase";
    const dueSuffix = task.dueDate ? ` · Due ${task.dueDate}` : "";
    return {
      label: `${issueKey}:${phaseName}:${task.title}`,
      tooltip: `${task.title} · ${statusLabel(task.status)}${dueSuffix}`,
      style: dependencyBadgeStyle("TASK", task.status),
    };
  };

  return (
    <div className="space-y-4">
      {[...issue.phases]
        .sort((a, b) => {
          const orderA = phaseOrder.indexOf(a.kind ?? "");
          const orderB = phaseOrder.indexOf(b.kind ?? "");
          if (orderA === -1 && orderB === -1) {
            return a.name.localeCompare(b.name);
          }
          if (orderA === -1) {
            return 1;
          }
          if (orderB === -1) {
            return -1;
          }
          return orderA - orderB;
        })
        .map((phase) => {
          const phaseDeadlineLimit = minIsoDate(issue.deadline, phase.deadline);
          return (
            <div
              key={phase.id}
              className="rounded-2xl border border-slate-200/60 bg-white/90 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Status</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${phaseStatusStyle(
                        phase.status,
                      )}`}
                    >
                      {statusLabel(phase.status)}
                    </span>
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                        phase.deadline
                          ? "border-sky-200 bg-sky-100 text-sky-700"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                      type="button"
                      onClick={() =>
                        setOpenPhaseDeadlinePopover((current) =>
                          current === phase.id ? null : phase.id,
                        )
                      }
                    >
                      <Icon name="calendar" size={12} />
                      {phase.deadline ?? "Deadline"}
                    </button>
                    <select
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                      value={phase.status}
                      disabled={phaseStatusSaving[phase.id]}
                      onChange={async (event) => {
                        const nextStatus = event.target.value;
                        if (nextStatus === phase.status) {
                          return;
                        }
                        if (nextStatus === "DONE") {
                          updateCompletionDraft(phase.id, {
                            pendingStatus: "DONE",
                            error: null,
                            comment: phase.completionComment ?? "",
                            artifactUrl: phase.completionArtifactUrl ?? "",
                          });
                          return;
                        }
                        setStatusError(null);
                        updateCompletionDraft(phase.id, { pendingStatus: null });
                        setPhaseStatusSaving((prev) => ({
                          ...prev,
                          [phase.id]: true,
                        }));
                        const { data, error: apiError } = await api.PATCH(
                          "/issues/{issueId}/phases/{phaseId}",
                          {
                            params: {
                              path: { issueId, phaseId: phase.id },
                            },
                            body: {
                              status: nextStatus,
                            },
                          },
                        );
                        if (apiError || !data) {
                          setStatusError("Unable to update phase status.");
                          setPhaseStatusSaving((prev) => ({
                            ...prev,
                            [phase.id]: false,
                          }));
                          return;
                        }
                        onIssueUpdate(data as IssueDetail);
                        setPhaseStatusSaving((prev) => ({
                          ...prev,
                          [phase.id]: false,
                        }));
                      }}
                    >
                      {phaseStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {phaseLabel(phase)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Assignee: {phase.assigneeId}
                  </p>
                  {phase.status === "DONE" && phase.completionComment && (
                    <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <p className="font-semibold text-emerald-800">
                        Completion note
                      </p>
                      <p className="mt-1">{phase.completionComment}</p>
                      {phase.completionArtifactUrl && (
                        <a
                          className="mt-2 inline-flex text-emerald-700 underline"
                          href={phase.completionArtifactUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View artifact
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {phase.tasks.length} tasks
                </div>
              </div>
              {openPhaseDeadlinePopover === phase.id && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Phase deadline
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <label className="text-[11px] text-slate-500">
                      Deadline
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        type="date"
                        max={issue.deadline ?? undefined}
                        value={getPhaseDeadlineDraft(phase)}
                        onChange={(event) =>
                          updatePhaseDeadlineDraft(phase.id, event.target.value)
                        }
                      />
                    </label>
                    {!isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline) && (
                      <p className="text-xs text-rose-600">
                        Phase deadline must be on or before the issue deadline.
                      </p>
                    )}
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="button"
                      disabled={
                        !isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline)
                      }
                      onClick={async () => {
                        const before = issue;
                        const { data, error: apiError } = await api.PATCH(
                          "/issues/{issueId}/phases/{phaseId}",
                          {
                            params: { path: { issueId, phaseId: phase.id } },
                            body: {
                              deadline: getPhaseDeadlineDraft(phase) || undefined,
                            },
                          },
                        );
                        if (!apiError && data) {
                          const updated = data as IssueDetail;
                          onIssueUpdate(updated);
                          onDeadlineImpact?.(before, updated);
                          setOpenPhaseDeadlinePopover(null);
                        }
                      }}
                    >
                      <Icon name="check" size={12} />
                      Save
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                      type="button"
                      onClick={() => setOpenPhaseDeadlinePopover(null)}
                    >
                      <Icon name="x" size={12} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {phase.tasks.length > 0 && (() => {
                const progress = phaseProgress(phase.tasks);
                const segments = [
                  { key: "NOT_STARTED", color: "bg-slate-300" },
                  { key: "IN_PROGRESS", color: "bg-sky-400" },
                  { key: "PAUSED", color: "bg-amber-400" },
                  { key: "ABANDONED", color: "bg-rose-400" },
                  { key: "DONE", color: "bg-emerald-500" },
                ];
                return (
                  <div className="mt-3">
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                      {segments.map((segment) => {
                        const count = progress.counts[segment.key] ?? 0;
                        const width =
                          progress.total > 0 ? (count / progress.total) * 100 : 0;
                        if (width <= 0) {
                          return null;
                        }
                        return (
                          <span
                            key={segment.key}
                            className={`${segment.color}`}
                            style={{ width: `${width}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      <span>{progress.counts.DONE} done</span>
                      <span>{progress.counts.IN_PROGRESS} active</span>
                      <span>{progress.counts.PAUSED} paused</span>
                      <span>{progress.counts.ABANDONED} abandoned</span>
                      <span>{progress.counts.NOT_STARTED} not started</span>
                    </div>
                  </div>
                );
              })()}
              {getCompletionDraft(phase).pendingStatus === "DONE" &&
                phase.status !== "DONE" && (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                      Complete phase
                    </p>
                    <div className="mt-2 grid gap-2">
                      <textarea
                        className="min-h-[80px] w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
                        placeholder="Completion note (required)"
                        value={getCompletionDraft(phase).comment}
                        onChange={(event) =>
                          updateCompletionDraft(phase.id, {
                            comment: event.target.value,
                          })
                        }
                      />
                      <input
                        className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
                        placeholder="Artifact URL (optional)"
                        value={getCompletionDraft(phase).artifactUrl}
                        onChange={(event) =>
                          updateCompletionDraft(phase.id, {
                            artifactUrl: event.target.value,
                          })
                        }
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
                          type="button"
                          disabled={getCompletionDraft(phase).saving}
                          onClick={async () => {
                            const draft = getCompletionDraft(phase);
                            if (!draft.comment.trim()) {
                              updateCompletionDraft(phase.id, {
                                error: "Completion note is required.",
                              });
                              return;
                            }
                            updateCompletionDraft(phase.id, {
                              saving: true,
                              error: null,
                            });
                            const { data, error: apiError } = await api.PATCH(
                              "/issues/{issueId}/phases/{phaseId}",
                              {
                                params: {
                                  path: { issueId, phaseId: phase.id },
                                },
                                body: {
                                  status: "DONE",
                                  completionComment: draft.comment,
                                  completionArtifactUrl:
                                    draft.artifactUrl.trim() || undefined,
                                },
                              },
                            );
                            if (apiError || !data) {
                              updateCompletionDraft(phase.id, {
                                saving: false,
                                error: "Unable to complete phase.",
                              });
                              return;
                            }
                            onIssueUpdate(data as IssueDetail);
                            updateCompletionDraft(phase.id, {
                              comment: "",
                              artifactUrl: "",
                              saving: false,
                              error: null,
                              pendingStatus: null,
                            });
                          }}
                        >
                          <Icon name="check" size={12} />
                          {getCompletionDraft(phase).saving ? "Finishing…" : "Finish phase"}
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700"
                          type="button"
                          onClick={() =>
                            updateCompletionDraft(phase.id, {
                              pendingStatus: null,
                              error: null,
                            })
                          }
                        >
                          <Icon name="x" size={12} />
                          Cancel
                        </button>
                      </div>
                      {getCompletionDraft(phase).error && (
                        <p className="text-xs text-rose-600">
                          {getCompletionDraft(phase).error}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              <div className="mt-3 space-y-2">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-slate-700 ${taskStatusStyle(
                        task.status,
                      )}`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip
                          content={
                            task.startDate || task.dueDate
                              ? `Start: ${task.startDate ?? "—"} · Due: ${task.dueDate ?? "—"}`
                              : "Set dates"
                          }
                        >
                          <button
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                              task.startDate || task.dueDate
                                ? "border-sky-200 bg-sky-100 text-sky-700"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                            type="button"
                            onClick={() =>
                              setOpenTaskDatePopover((current) =>
                                current === task.id ? null : task.id,
                              )
                            }
                          >
                            <Icon name="calendar" size={12} />
                            {task.startDate || task.dueDate
                              ? `${task.startDate ?? "—"} → ${task.dueDate ?? "—"}`
                              : "Dates"}
                          </button>
                        </Tooltip>
                        <Tooltip content={`Assignee: ${userLabel(task.assigneeId)}`}>
                          <button
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                              task.assigneeId
                                ? "border-violet-200 bg-violet-100 text-violet-700"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                            type="button"
                            onClick={() =>
                              setOpenTaskAssigneePopover((current) =>
                                current === task.id ? null : task.id,
                              )
                            }
                          >
                            <Icon name="user" size={12} />
                            {userLabel(task.assigneeId)}
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={
                            task.dependencies && task.dependencies.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Dependencies
                                </p>
                                <ul className="space-y-1">
                                  {task.dependencies.map((dep, index) => (
                                    <li key={`${dep.type}-${dep.targetId}-${index}`}>
                                      {formatDependency(dep).label}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              "Set dependencies"
                            )
                          }
                        >
                          <button
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                              task.dependencies && task.dependencies.length > 0
                                ? dependencyBadgeStyle(
                                    "TASK",
                                    worstStatus(
                                      task.dependencies.map((dep) => dependencyStatus(dep)),
                                    ),
                                  )
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                            type="button"
                            onClick={() =>
                              setOpenTaskDependencyPopover((current) =>
                                current === task.id ? null : task.id,
                              )
                            }
                          >
                            <Icon name="link" size={12} />
                            {task.dependencies && task.dependencies.length > 0
                              ? `${task.dependencies.length} deps`
                              : "Deps"}
                          </button>
                        </Tooltip>
                        <select
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                          value={task.status}
                          disabled={taskStatusSaving[task.id]}
                          onChange={async (event) => {
                            const nextStatus = event.target.value;
                            if (nextStatus === task.status) {
                              return;
                            }
                            setStatusError(null);
                            setTaskStatusSaving((prev) => ({
                              ...prev,
                              [task.id]: true,
                            }));
                            const { data, error: apiError } = await api.PATCH(
                              "/issues/{issueId}/phases/{phaseId}/tasks/{taskId}",
                              {
                                params: {
                                  path: {
                                    issueId,
                                    phaseId: phase.id,
                                    taskId: task.id,
                                  },
                                },
                                body: {
                                  status: nextStatus,
                                },
                              },
                            );
                            if (apiError || !data) {
                              setStatusError("Unable to update task status.");
                              setTaskStatusSaving((prev) => ({
                                ...prev,
                                [task.id]: false,
                              }));
                              return;
                            }
                            onIssueUpdate(data as IssueDetail);
                            setTaskStatusSaving((prev) => ({
                              ...prev,
                              [task.id]: false,
                            }));
                          }}
                        >
                          {taskStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {openTaskDatePopover === task.id && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Dates
                        </p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <label className="text-[11px] text-slate-500">
                            Start
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              type="date"
                              value={getTaskMetaDraft(task).startDate}
                              onChange={(event) =>
                                updateTaskMetaDraft(task, {
                                  startDate: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-[11px] text-slate-500">
                            Due
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              type="date"
                              max={phaseDeadlineLimit ?? undefined}
                              value={getTaskMetaDraft(task).dueDate}
                              onChange={(event) =>
                                updateTaskMetaDraft(task, {
                                  dueDate: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        {!isOnOrBefore(
                          getTaskMetaDraft(task).dueDate,
                          phaseDeadlineLimit,
                        ) && (
                          <p className="mt-2 text-xs text-rose-600">
                            Due date must be on or before the phase or issue deadline.
                          </p>
                        )}
                        {!isDateRangeValid(
                          getTaskMetaDraft(task).startDate,
                          getTaskMetaDraft(task).dueDate,
                        ) && (
                          <p className="mt-2 text-xs text-rose-600">
                            Due date must be after the start date.
                          </p>
                        )}
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            type="button"
                            onClick={() => setOpenTaskDatePopover(null)}
                          >
                            <Icon name="x" size={12} />
                            Close
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            type="button"
                            disabled={
                              !isDateRangeValid(
                                getTaskMetaDraft(task).startDate,
                                getTaskMetaDraft(task).dueDate,
                              ) ||
                              !isOnOrBefore(
                                getTaskMetaDraft(task).dueDate,
                                phaseDeadlineLimit,
                              )
                            }
                            onClick={async () => {
                              const draft = getTaskMetaDraft(task);
                              if (!isDateRangeValid(draft.startDate, draft.dueDate)) {
                                return;
                              }
                              const { data, error: apiError } = await api.PATCH(
                                "/issues/{issueId}/phases/{phaseId}/tasks/{taskId}",
                                {
                                  params: {
                                    path: {
                                      issueId,
                                      phaseId: phase.id,
                                      taskId: task.id,
                                    },
                                  },
                                  body: {
                                    startDate: draft.startDate || undefined,
                                    dueDate: draft.dueDate || undefined,
                                  },
                                },
                              );
                              if (!apiError && data) {
                                onIssueUpdate(data as IssueDetail);
                                setOpenTaskDatePopover(null);
                              }
                            }}
                          >
                            <Icon name="check" size={12} />
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    {openTaskDependencyPopover === task.id && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Dependencies
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          {getTaskMetaDraft(task).dependencies.map((dep, depIndex) => (
                            <DependencyBadge
                              key={`${dep.type}-${dep.targetId}-${depIndex}`}
                              label={formatDependency(dep).label}
                              tooltip={formatDependency(dep).tooltip}
                              style={formatDependency(dep).style}
                              href={dependencyHref(dep)}
                              onRemove={() => {
                                const nextDeps = getTaskMetaDraft(task).dependencies.filter(
                                  (_, index) => index !== depIndex,
                                );
                                updateTaskMetaDraft(task, { dependencies: nextDeps });
                              }}
                            />
                          ))}
                          {getTaskMetaDraft(task).dependencies.length === 0 && (
                            <span className="text-slate-400">No dependencies yet.</span>
                          )}
                        </div>
                        <DependencyPicker
                          issue={issue}
                          dependencyIssues={dependencyIssues}
                          state={getDependencyState(task.id)}
                          setState={(updater) => setDependencyState(task.id, updater)}
                          onSearch={(query) => void searchIssues(task.id, query)}
                          ensureIssueDetail={ensureIssueDetail}
                          onAdd={(dep) => addDependencyForTask(task, dep)}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            type="button"
                            onClick={() => setOpenTaskDependencyPopover(null)}
                          >
                            <Icon name="x" size={12} />
                            Close
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                            type="button"
                            onClick={async () => {
                              const draft = getTaskMetaDraft(task);
                              const { data, error: apiError } = await api.PATCH(
                                "/issues/{issueId}/phases/{phaseId}/tasks/{taskId}",
                                {
                                  params: {
                                    path: {
                                      issueId,
                                      phaseId: phase.id,
                                      taskId: task.id,
                                    },
                                  },
                                  body: {
                                    dependencies: draft.dependencies,
                                  },
                                },
                              );
                              if (!apiError && data) {
                                onIssueUpdate(data as IssueDetail);
                                setOpenTaskDependencyPopover(null);
                              }
                            }}
                          >
                            <Icon name="check" size={12} />
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    {openTaskAssigneePopover === task.id && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Assignee
                        </p>
                        <div className="mt-2 flex flex-wrap items-end gap-3">
                          <label className="min-w-[200px] text-[11px] text-slate-500">
                            User
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              placeholder="Select user"
                              list={`task-assignee-options-${task.id}`}
                              value={getTaskMetaDraft(task).assigneeId}
                              onChange={(event) =>
                                updateTaskMetaDraft(task, {
                                  assigneeId: event.target.value,
                                })
                              }
                            />
                          </label>
                          <div className="flex gap-2">
                            <button
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                              type="button"
                              onClick={() => {
                                updateTaskMetaDraft(task, { assigneeId: "" });
                              }}
                            >
                              <Icon name="x" size={12} />
                              Clear
                            </button>
                            <button
                              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                              type="button"
                              onClick={async () => {
                                const draft = getTaskMetaDraft(task);
                                const { data, error: apiError } = await api.PATCH(
                                  "/issues/{issueId}/phases/{phaseId}/tasks/{taskId}",
                                  {
                                    params: {
                                      path: {
                                        issueId,
                                        phaseId: phase.id,
                                        taskId: task.id,
                                      },
                                    },
                                    body: {
                                      assigneeId: draft.assigneeId || undefined,
                                    },
                                  },
                                );
                                if (!apiError && data) {
                                  onIssueUpdate(data as IssueDetail);
                                  setOpenTaskAssigneePopover(null);
                                }
                              }}
                            >
                              <Icon name="check" size={12} />
                              Save
                            </button>
                          </div>
                        </div>
                        <datalist id={`task-assignee-options-${task.id}`}>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.displayName}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {statusError && (
                <p className="text-xs text-rose-600">{statusError}</p>
              )}
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Add task
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-24 text-xs"
                      placeholder="Task title"
                      value={getTaskDraft(phase.id).title}
                      onChange={(event) =>
                        updateTaskDraft(phase.id, { title: event.target.value })
                      }
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <Tooltip
                        content={
                          getTaskDraft(phase.id).startDate ||
                          getTaskDraft(phase.id).dueDate
                            ? `Start: ${getTaskDraft(phase.id).startDate || "—"} · Due: ${getTaskDraft(phase.id).dueDate || "—"}`
                            : "Set dates"
                        }
                      >
                        <button
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            getTaskDraft(phase.id).startDate ||
                            getTaskDraft(phase.id).dueDate
                              ? "border-sky-200 bg-sky-100 text-sky-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          type="button"
                          onClick={() =>
                            setOpenTaskDatePopover((current) =>
                              current === `draft-${phase.id}` ? null : `draft-${phase.id}`,
                            )
                          }
                        >
                          <Icon name="calendar" size={12} />
                          {(getTaskDraft(phase.id).startDate ||
                            getTaskDraft(phase.id).dueDate) && (
                            <span className="ml-1 text-[11px]">
                              {getTaskDraft(phase.id).startDate || "—"} →{" "}
                              {getTaskDraft(phase.id).dueDate || "—"}
                            </span>
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={
                          getTaskDraft(phase.id).dependencies.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Dependencies
                              </p>
                              <ul className="space-y-1">
                                {getTaskDraft(phase.id).dependencies.map(
                                  (dep, index) => (
                                    <li key={`${dep.type}-${dep.targetId}-${index}`}>
                                      {formatDependency(dep).label}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          ) : (
                            "Set dependencies"
                          )
                        }
                      >
                        <button
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            getTaskDraft(phase.id).dependencies.length > 0
                              ? dependencyBadgeStyle(
                                  "TASK",
                                  worstStatus(
                                    getTaskDraft(phase.id).dependencies.map((dep) =>
                                      dependencyStatus(dep),
                                    ),
                                  ),
                                )
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          type="button"
                          onClick={() =>
                            setOpenTaskDependencyPopover((current) =>
                              current === `draft-${phase.id}` ? null : `draft-${phase.id}`,
                            )
                          }
                        >
                          <Icon name="link" size={12} />
                          {getTaskDraft(phase.id).dependencies.length > 0 && (
                            <span className="ml-1 text-[11px]">
                              {getTaskDraft(phase.id).dependencies.length}
                            </span>
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="relative min-w-[180px]">
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      placeholder="Assignee ID"
                      value={getTaskDraft(phase.id).assigneeId}
                      list={`task-assignee-options-${phase.id}`}
                      onChange={(event) =>
                        updateTaskDraft(phase.id, {
                          assigneeId: event.target.value,
                        })
                      }
                    />
                    <span className="pointer-events-none absolute right-2 top-2 text-xs text-slate-400">
                      ▾
                    </span>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={getTaskDraft(phase.id).saving}
                    onClick={async () => {
                      const draft = getTaskDraft(phase.id);
                      if (!draft.title.trim()) {
                        updateTaskDraft(phase.id, {
                          error: "Task title is required.",
                        });
                        return;
                      }
                      if (!isDateRangeValid(draft.startDate, draft.dueDate)) {
                        updateTaskDraft(phase.id, {
                          error: "Due date must be after the start date.",
                        });
                        return;
                      }
                      if (!isOnOrBefore(draft.dueDate, phaseDeadlineLimit)) {
                        updateTaskDraft(phase.id, {
                          error: "Due date must be on or before the phase deadline.",
                        });
                        return;
                      }
                      updateTaskDraft(phase.id, { saving: true, error: null });
                      const { data, error: apiError } = await api.POST(
                        "/issues/{issueId}/phases/{phaseId}/tasks",
                        {
                          params: {
                            path: { issueId, phaseId: phase.id },
                          },
                          body: {
                            title: draft.title,
                            assigneeId: draft.assigneeId || undefined,
                            startDate: draft.startDate || undefined,
                            dueDate: draft.dueDate || undefined,
                            dependencies: draft.dependencies,
                          },
                        },
                      );
                      if (apiError || !data) {
                        updateTaskDraft(phase.id, {
                          saving: false,
                          error: "Unable to add task.",
                        });
                        return;
                      }
                      onIssueUpdate(data as IssueDetail);
                      updateTaskDraft(phase.id, {
                        title: "",
                        assigneeId: "",
                        startDate: "",
                        dueDate: "",
                        dependencies: [],
                        saving: false,
                        error: null,
                      });
                      setOpenTaskDatePopover(null);
                      setOpenTaskDependencyPopover(null);
                    }}
                  >
                    <Icon name="plus" size={12} />
                    {getTaskDraft(phase.id).saving ? "Adding…" : "Add"}
                  </button>
                </div>
                {openTaskDatePopover === `draft-${phase.id}` && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dates
                    </p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <label className="text-[11px] text-slate-500">
                        Start
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          type="date"
                          value={getTaskDraft(phase.id).startDate}
                          onChange={(event) =>
                            updateTaskDraft(phase.id, {
                              startDate: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="text-[11px] text-slate-500">
                        Due
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          type="date"
                          max={phaseDeadlineLimit ?? undefined}
                          value={getTaskDraft(phase.id).dueDate}
                          onChange={(event) =>
                            updateTaskDraft(phase.id, {
                              dueDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    {!isOnOrBefore(
                      getTaskDraft(phase.id).dueDate,
                      phaseDeadlineLimit,
                    ) && (
                      <p className="mt-2 text-xs text-rose-600">
                        Due date must be on or before the phase or issue deadline.
                      </p>
                    )}
                    {!isDateRangeValid(
                      getTaskDraft(phase.id).startDate,
                      getTaskDraft(phase.id).dueDate,
                    ) && (
                      <p className="mt-2 text-xs text-rose-600">
                        Due date must be after the start date.
                      </p>
                    )}
                  </div>
                )}
                {openTaskDependencyPopover === `draft-${phase.id}` && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dependencies
                    </p>
                    <DependencyPicker
                      issue={issue}
                      dependencyIssues={dependencyIssues}
                      state={getDependencyState(`draft-${phase.id}`)}
                      setState={(updater) =>
                        setDependencyState(`draft-${phase.id}`, updater)
                      }
                      onSearch={(query) =>
                        void searchIssues(`draft-${phase.id}`, query)
                      }
                      ensureIssueDetail={ensureIssueDetail}
                      onAdd={(dep) => addDependencyForDraft(phase.id, dep)}
                    />
                    {getTaskDraft(phase.id).dependencies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                        {getTaskDraft(phase.id).dependencies.map((dep, depIndex) => (
                          <DependencyBadge
                            key={`${dep.type}-${dep.targetId}-${depIndex}`}
                            label={formatDependency(dep).label}
                            tooltip={formatDependency(dep).tooltip}
                            style={formatDependency(dep).style}
                            href={dependencyHref(dep)}
                            onRemove={() => {
                              const nextDeps = getTaskDraft(phase.id).dependencies.filter(
                                (_, index) => index !== depIndex,
                              );
                              updateTaskDraft(phase.id, { dependencies: nextDeps });
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {getTaskDraft(phase.id).error && (
                  <p className="mt-2 text-xs text-rose-600">
                    {getTaskDraft(phase.id).error}
                  </p>
                )}
              </div>
              <datalist id={`task-assignee-options-${phase.id}`}>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </datalist>
            </div>
          );
        })}
    </div>
  );
}
