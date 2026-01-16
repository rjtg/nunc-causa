"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";
import { Typeahead } from "@/components/typeahead";
import { IssueSummaryCard } from "@/components/issue-summary-card";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { StatusBadgeSelect } from "@/components/status-badge-select";
import { IssueProgressBar } from "@/components/issue-progress-bar";
import { DateRangePicker } from "@/components/date-range-picker";
import { DatePicker } from "@/components/date-picker";
import Link from "next/link";
import type { IssueDetail, Phase, Task, UserOption } from "../types";
import type { ReactNode } from "react";
import type { createApiClient } from "@/lib/api/client";
import {
  buildIssuePhaseSegments,
  buildTaskSegments,
  isPastDeadline,
  segmentStyle,
} from "../progress";

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
  status?: string | null;
  deadline?: string | null;
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
  onRequestUsers?: () => void;
};

const phaseOrder = [
  "INVESTIGATION",
  "PROPOSE_SOLUTION",
  "DEVELOPMENT",
  "ACCEPTANCE_TEST",
  "ROLLOUT",
];

const phaseStatuses = ["NOT_STARTED", "IN_PROGRESS", "DONE", "FAILED"];
const phaseOptionColor = (status: string) => {
  switch (status) {
    case "DONE":
      return "text-emerald-700";
    case "IN_PROGRESS":
      return "text-sky-700";
    case "FAILED":
      return "text-rose-700";
    default:
      return "text-slate-600";
  }
};
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

const taskStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "IN_PROGRESS":
      return "border-sky-200 bg-sky-100 text-sky-800";
    case "PAUSED":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "ABANDONED":
      return "border-rose-200 bg-rose-100 text-rose-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

const issueOverdueClass = (status?: string | null, deadline?: string | null) => {
  if (!status || status === "DONE" || status === "FAILED") {
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

const taskCardClass = (task: Task) => {
  if (task.status === "DONE" || task.status === "ABANDONED") {
    return taskStatusStyle(task.status);
  }
  if (!isPastDeadline(task.dueDate)) {
    return taskStatusStyle(task.status);
  }
  const tone = (() => {
    switch (task.status) {
      case "IN_PROGRESS":
        return "to-sky-50";
      case "PAUSED":
        return "to-amber-50";
      default:
        return "to-slate-50";
    }
  })();
  return `border-rose-500/80 bg-gradient-to-r from-rose-200 via-rose-100 ${tone}`;
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

const phaseCardTone = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-50/80";
    case "IN_PROGRESS":
      return "bg-sky-50/80";
    case "FAILED":
      return "bg-rose-50/80";
    default:
      return "bg-slate-50/80";
  }
};

const phaseCardClass = (phase: Phase, borderBase: string) => {
  const base = `${borderBase} ${phaseCardTone(phase.status)}`;
  if (phase.status === "DONE" || phase.status === "FAILED") {
    return base;
  }
  if (!isPastDeadline(phase.deadline)) {
    return base;
  }
  const tone = phase.status === "IN_PROGRESS" ? "to-sky-50" : "to-slate-50";
  return `${borderBase} border-rose-500/80 bg-gradient-to-r from-rose-200 via-rose-100 ${tone}`;
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

const phaseStatusBadges = (progress: ReturnType<typeof phaseProgress>) => {
  const counts = progress.counts;
  const hasAny =
    counts.DONE +
      counts.IN_PROGRESS +
      counts.PAUSED +
      counts.ABANDONED +
      counts.NOT_STARTED >
    0;
  if (!hasAny) {
    return (
      <span className="text-[11px] text-slate-500">No tasks yet.</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {counts.DONE > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
          Done {counts.DONE}
        </span>
      )}
      {counts.IN_PROGRESS > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-700">
          In progress {counts.IN_PROGRESS}
        </span>
      )}
      {counts.PAUSED > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">
          Paused {counts.PAUSED}
        </span>
      )}
      {counts.ABANDONED > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-700">
          Abandoned {counts.ABANDONED}
        </span>
      )}
      {counts.NOT_STARTED > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
          Not started {counts.NOT_STARTED}
        </span>
      )}
    </div>
  );
};

const phaseProgressSegments = (phase: Phase, issueDeadline?: string | null) => {
  if (phase.tasks.length === 0) {
    const overdue =
      isPastDeadline(phase.deadline ?? issueDeadline ?? null) &&
      phase.status != "DONE" &&
      phase.status != "FAILED";
    const visual = segmentStyle(phase.status, overdue);
    return {
      segments: [
        {
          color: visual.color,
          style: visual.style,
          count: 1,
        },
      ],
      total: 1,
    };
  }
  return {
    segments: buildTaskSegments(phase.tasks, false, undefined, {
      phaseDeadline: phase.deadline ?? null,
      issueDeadline: issueDeadline ?? null,
    }).map((segment) => ({
      ...segment,
      tooltip: phaseStatusBadges(phaseProgress(phase.tasks)),
    })),
    total: phase.tasks.length,
  };
};

const dependencyKey = (dep: { type?: string | null; targetId?: string | null }) =>
  `${dep.type ?? "TASK"}:${dep.targetId ?? ""}`;

const uniqueDependencies = (deps: { type: string; targetId: string }[]) => {
  const seen = new Set<string>();
  return deps.filter((dep) => {
    const key = dependencyKey(dep);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const statusLabel = (value: string) => {
  if (value === "NOT_ACTIVE") {
    return "Not active";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

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
  users,
  dependencyIssues,
  state,
  setState,
  onSearch,
  ensureIssueDetail,
  onAdd,
}: {
  issue: IssueDetail;
  users: UserOption[];
  dependencyIssues: Record<string, IssueDetail>;
  state: DependencySearchState;
  setState: (updater: (current: DependencySearchState) => DependencySearchState) => void;
  onSearch: (query: string) => void;
  ensureIssueDetail: (issueId: string) => Promise<IssueDetail | null>;
  onAdd: (dep: { type: string; targetId: string }) => void;
}) => {
  const [localQuery, setLocalQuery] = useState(state.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(state.query);
  }, [state.query]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  const userLabel = (userId?: string | null) => {
    if (!userId) {
      return "Unassigned";
    }
    return users.find((user) => user.id === userId)?.displayName ?? userId;
  };
  const currentIssueSummary = {
    id: issue.id,
    title: issue.title,
    description: issue.description ?? null,
    status: issue.status,
    deadline: issue.deadline ?? null,
  };
  const results = state.query.trim().length > 0 ? state.results : [];
  const visibleResults = results.filter((result) => result.id !== issue.id);
  const normalizedQuery = state.query.trim().toLowerCase();
  const exactMatch =
    normalizedQuery.length > 0
      ? visibleResults.find((result) => result.id.toLowerCase() === normalizedQuery)
      : null;
  const issuesToShow = exactMatch
    ? [exactMatch]
    : visibleResults.length > 0
      ? visibleResults
      : [currentIssueSummary];

  const issueTooltip = (detail: IssueDetail | null, fallback: IssueSummary) => {
    if (!detail) {
      return fallback.title;
    }
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-800">{detail.title}</p>
        {detail.description && (
          <p className="text-[11px] text-slate-600 line-clamp-3">
            {detail.description}
          </p>
        )}
        {detail.deadline && (
          <div className="text-[11px] text-slate-600">
            — → {detail.deadline}
          </div>
        )}
        {detail.phases.length > 0 && (
          <IssueProgressBar
            progressSegments={buildIssuePhaseSegments(detail, userLabel) ?? undefined}
            progressTotal={1}
          />
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
        {[...detail.phases]
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
          .map((phase) => (
          <div
            key={phase.id}
            className={`rounded-lg border px-3 py-2 ${phaseCardClass(
              phase,
              "border-slate-100",
            )}`}
            onClick={() => onAdd({ type: "PHASE", targetId: phase.id })}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {phase.tasks.length > 0 ? (
                    <button
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        togglePhase(detail.id, phase.id);
                      }}
                      aria-label={
                        isPhaseExpanded(detail.id, phase.id)
                          ? "Collapse phase"
                          : "Expand phase"
                      }
                    >
                      <Icon
                        name={
                          isPhaseExpanded(detail.id, phase.id)
                            ? "chevron-down"
                            : "chevron-right"
                        }
                        size={12}
                      />
                    </button>
                  ) : (
                    <span className="h-6 w-6" aria-hidden />
                  )}
                  <p className="text-xs font-semibold text-slate-700">
                    {phaseLabel(phase)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {phase.assigneeId && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-700">
                      {userLabel(phase.assigneeId)}
                    </span>
                  )}
                  {phase.deadline && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-700">
                      <Icon name="calendar" size={12} />
                      {formatDate(phase.deadline)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                    {phase.tasks.length} task
                    {phase.tasks.length === 1 ? "" : "s"}
                  </span>
                  <div className="w-36">
                    {(() => {
                      const { segments, total } = phaseProgressSegments(
                        phase,
                        issue.deadline ?? null,
                      );
                      return (
                        <IssueProgressBar
                          progressSegments={segments}
                          progressTotal={total}
                        />
                      );
                    })()}
                  </div>
                </div>
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
        value={localQuery}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setLocalQuery(nextQuery);
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          debounceRef.current = setTimeout(() => {
            onSearch(nextQuery);
          }, 200);
        }}
      />
      {state.loading && <p className="text-xs text-slate-400">Searching…</p>}
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
      <div className="space-y-2">
        {issuesToShow.map((summary, index) => {
          const isCurrent = summary.id === issue.id;
          const detail = isCurrent ? issue : dependencyIssues[summary.id];
          return (
            <IssueSummaryCard
              key={summary.id}
              id={summary.id}
              title={summary.title ?? summary.id}
              description={summary.description}
              descriptionTooltip={summary.description ?? undefined}
              showDescription={false}
              note={
                isCurrent
                  ? "Current issue"
                  : undefined
              }
              tone={isCurrent ? "muted" : "default"}
              tooltip={issueTooltip(detail ?? null, summary)}
              progressSegments={buildIssuePhaseSegments(detail ?? null, userLabel) ?? undefined}
              progressTotal={1}
              onSelect={() => onAdd({ type: "ISSUE", targetId: summary.id })}
              className={issueOverdueClass(detail?.status ?? summary.status, detail?.deadline ?? summary.deadline)}
              left={
                detail && detail.phases.length > 0 ? (
                  <button
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void toggleIssue(summary.id);
                    }}
                    aria-label={isIssueExpanded(summary.id) ? "Collapse issue" : "Expand issue"}
                  >
                    <Icon
                      name={isIssueExpanded(summary.id) ? "chevron-down" : "chevron-right"}
                      size={12}
                    />
                  </button>
                ) : (
                  <span className="h-6 w-6" aria-hidden />
                )
              }
            >
              {isIssueExpanded(summary.id) && detail && renderIssueDetail(detail)}
              {isIssueExpanded(summary.id) && !detail && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Loading issue details…
                </p>
              )}
            </IssueSummaryCard>
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
  onRequestUsers,
}: PhaseBoardProps) {
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
  const [openTaskDatePopover, setOpenTaskDatePopover] = useState<string | null>(null);
  const [openTaskDependencyPopover, setOpenTaskDependencyPopover] = useState<string | null>(null);
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
  const [phaseDeadlineShift, setPhaseDeadlineShift] = useState(0);
  const [phaseDeadlineDrafts, setPhaseDeadlineDrafts] = useState<Record<string, string>>({});
  const [taskDateShift, setTaskDateShift] = useState(0);
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

  const userWorkload = (userId?: string | null) => {
    if (!userId) {
      return null;
    }
    const user = users.find((option) => option.id === userId);
    if (!user) {
      return null;
    }
    const openIssues = user.openIssueCount ?? 0;
    const openPhases = user.openPhaseCount ?? 0;
    const openTasks = user.openTaskCount ?? 0;
    return `${openIssues} / ${openPhases} / ${openTasks}`;
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
      status: item.status ?? null,
      deadline: item.deadline ?? null,
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
    const nextDeps = uniqueDependencies([...getTaskMetaDraft(task).dependencies, dep]);
    updateTaskMetaDraft(task, { dependencies: nextDeps });
  };

  const addDependencyForDraft = (phaseId: string, dep: { type: string; targetId: string }) => {
    const draft = getTaskDraft(phaseId);
    updateTaskDraft(phaseId, {
      dependencies: uniqueDependencies([...draft.dependencies, dep]),
    });
  };

  const submitTaskDraft = async (phase: Phase) => {
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
    const phaseDeadlineLimit = minIsoDate(issue.deadline, phase.deadline);
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
          dependencies: uniqueDependencies(draft.dependencies),
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

  const calcPopoverShift = (element: HTMLElement | null) => {
    if (!element) {
      return 0;
    }
    const rect = element.getBoundingClientRect();
    const padding = 12;
    let shift = 0;
    if (rect.left < padding) {
      shift = padding - rect.left;
    } else if (rect.right > window.innerWidth - padding) {
      shift = window.innerWidth - padding - rect.right;
    }
    return shift;
  };

  useLayoutEffect(() => {
    if (!openPhaseDeadlinePopover) {
      setPhaseDeadlineShift(0);
      return;
    }
    const element = document.querySelector(
      `[data-phase-deadline-popover-content="${openPhaseDeadlinePopover}"]`,
    ) as HTMLElement | null;
    setPhaseDeadlineShift(calcPopoverShift(element));
  }, [openPhaseDeadlinePopover]);

  useLayoutEffect(() => {
    if (!openTaskDatePopover) {
      setTaskDateShift(0);
      return;
    }
    const element = document.querySelector(
      `[data-task-date-popover-content="${openTaskDatePopover}"]`,
    ) as HTMLElement | null;
    setTaskDateShift(calcPopoverShift(element));
  }, [openTaskDatePopover]);

  useEffect(() => {
    if (!openPhaseDeadlinePopover && !openTaskDatePopover) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        openPhaseDeadlinePopover &&
        target?.closest(`[data-phase-deadline-popover="${openPhaseDeadlinePopover}"]`)
      ) {
        return;
      }
      if (
        openTaskDatePopover &&
        target?.closest(`[data-task-date-popover="${openTaskDatePopover}"]`)
      ) {
        return;
      }
      if (openPhaseDeadlinePopover) {
        setOpenPhaseDeadlinePopover(null);
      }
      if (openTaskDatePopover) {
        setOpenTaskDatePopover(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openPhaseDeadlinePopover, openTaskDatePopover]);

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
              <IssueProgressBar
                progressSegments={buildIssuePhaseSegments(issueDetail, userLabel) ?? undefined}
                progressTotal={1}
              />
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
              <IssueProgressBar
                progressSegments={buildTaskSegments(phase.tasks, false, undefined, {
                  phaseDeadline: phase.deadline ?? null,
                  issueDeadline:
                    dependencyIndex.issueById[dependencyIndex.issueForPhase[targetId] ?? ""]?.deadline ??
                    null,
                })}
                progressTotal={phase.tasks.length}
              />
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
              id={`phase-${phase.id}`}
              className={`rounded-2xl border p-4 ${phaseCardClass(
                phase,
                "border-slate-200/60",
              )}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <p className="text-lg font-semibold text-slate-900">
                      {phaseLabel(phase)}
                    </p>
                    <div className="relative" data-phase-deadline-popover={phase.id}>
                      <button
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
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
                      {openPhaseDeadlinePopover === phase.id && (
                        <div
                          className="absolute left-1/2 top-full z-20 mt-2 inline-block w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-lg"
                          data-phase-deadline-popover-content={phase.id}
                          style={{
                            transform: `translateX(calc(-50% + ${phaseDeadlineShift}px))`,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Phase deadline
                            </p>
                            <button
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                              type="button"
                              onClick={() => setOpenPhaseDeadlinePopover(null)}
                            >
                              <Icon name="x" size={12} />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-end gap-3">
                            <DatePicker
                              value={getPhaseDeadlineDraft(phase)}
                              max={issue.deadline ?? undefined}
                              onChange={(value) => updatePhaseDeadlineDraft(phase.id, value)}
                              onCancel={() => setOpenPhaseDeadlinePopover(null)}
                              onClear={() => updatePhaseDeadlineDraft(phase.id, "")}
                              onSave={async () => {
                                if (!isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline)) {
                                  return;
                                }
                                const nextDeadline = getPhaseDeadlineDraft(phase);
                                const clearDeadline = !nextDeadline;
                                const before = issue;
                                const { data, error: apiError } = await api.PATCH(
                                  "/issues/{issueId}/phases/{phaseId}",
                                  {
                                    params: { path: { issueId, phaseId: phase.id } },
                                    body: {
                                      deadline: clearDeadline ? undefined : nextDeadline || undefined,
                                      clearDeadline,
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
                            />
                            {!isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline) && (
                              <p className="text-xs text-rose-600">
                                Phase deadline must be on or before the issue deadline.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <StatusBadgeSelect
                      value={phase.status}
                      options={phaseStatuses}
                      label={statusLabel}
                      badgeClassName={phaseStatusStyle}
                      optionClassName={phaseOptionColor}
                      disabled={phaseStatusSaving[phase.id]}
                      onChange={async (nextStatus) => {
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
                    />
                    <UserBadgeSelect
                      value={phase.assigneeId}
                      users={users}
                      label="Assignee"
                      ariaLabel="Change assignee"
                      onRequestUsers={onRequestUsers}
                      onSave={async (nextId) => {
                        const { data, error: apiError } = await api.PATCH(
                          "/issues/{issueId}/phases/{phaseId}/assignee",
                          {
                            params: {
                              path: { issueId, phaseId: phase.id },
                            },
                            body: {
                              assigneeId: nextId ?? undefined,
                            },
                          },
                        );
                        if (apiError || !data) {
                          throw new Error("Unable to update assignee.");
                        }
                        onIssueUpdate(data as IssueDetail);
                      }}
                    />
                  </div>
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
              {phase.tasks.length > 0 && (() => {
                const progress = phaseProgress(phase.tasks);
                const statusBadges = phaseStatusBadges(progress);
                return (
                  <div className="mt-3">
                    <IssueProgressBar
                      progressSegments={buildTaskSegments(phase.tasks, false, statusBadges, {
                        phaseDeadline: phase.deadline ?? null,
                        issueDeadline: issue.deadline ?? null,
                      })}
                      progressTotal={progress.total}
                    />
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
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && event.ctrlKey) {
                            event.preventDefault();
                            if (getCompletionDraft(phase).saving) {
                              return;
                            }
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
                            void api
                              .PATCH("/issues/{issueId}/phases/{phaseId}", {
                                params: {
                                  path: { issueId, phaseId: phase.id },
                                },
                                body: {
                                  status: "DONE",
                                  completionComment: draft.comment,
                                  completionArtifactUrl:
                                    draft.artifactUrl.trim() || undefined,
                                },
                              })
                              .then(({ data, error: apiError }) => {
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
                              });
                          }
                        }}
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
              <div className="mt-3 space-y-0">
                {phase.tasks.map((task) => (
                  <div key={task.id}>
                    <div
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-slate-700 ${taskCardClass(
                        task,
                      )}`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative" data-task-date-popover={task.id}>
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
                          {openTaskDatePopover === task.id && (
                            <div
                              className="absolute left-1/2 top-full z-20 mt-2 inline-block w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-lg"
                              data-task-date-popover-content={task.id}
                              style={{
                                transform: `translateX(calc(-50% + ${taskDateShift}px))`,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Dates
                                </p>
                                <button
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                                  type="button"
                                  onClick={() => setOpenTaskDatePopover(null)}
                                >
                                  <Icon name="x" size={12} />
                                </button>
                              </div>
                        <DateRangePicker
                          startValue={getTaskMetaDraft(task).startDate}
                          endValue={getTaskMetaDraft(task).dueDate}
                          endMax={phaseDeadlineLimit ?? undefined}
                          onChange={({ start, end }) =>
                            updateTaskMetaDraft(task, {
                              startDate: start,
                              dueDate: end,
                            })
                          }
                          onCancel={() => setOpenTaskDatePopover(null)}
                          onClear={async () => {
                            updateTaskMetaDraft(task, { startDate: "", dueDate: "" });
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
                                  startDate: null,
                                  dueDate: null,
                                  clearStartDate: true,
                                  clearDueDate: true,
                                },
                              },
                            );
                            if (!apiError && data) {
                              onIssueUpdate(data as IssueDetail);
                            }
                          }}
                          onSave={async () => {
                            const draft = getTaskMetaDraft(task);
                            if (
                              !isDateRangeValid(draft.startDate, draft.dueDate) ||
                              !isOnOrBefore(draft.dueDate, phaseDeadlineLimit)
                            ) {
                              return;
                            }
                            const clearStartDate = !draft.startDate;
                            const clearDueDate = !draft.dueDate;
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
                                  startDate: draft.startDate || null,
                                  dueDate: draft.dueDate || null,
                                  clearStartDate,
                                  clearDueDate,
                                },
                              },
                            );
                            if (!apiError && data) {
                              onIssueUpdate(data as IssueDetail);
                              setOpenTaskDatePopover(null);
                            }
                          }}
                        />
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
                            </div>
                          )}
                        </div>
                        <UserBadgeSelect
                          value={task.assigneeId}
                          users={users}
                          label="Assignee"
                          ariaLabel="Change assignee"
                          onRequestUsers={onRequestUsers}
                          onSave={async (nextId) => {
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
                                  assigneeId: nextId ?? undefined,
                                },
                              },
                            );
                            if (apiError || !data) {
                              throw new Error("Unable to update assignee.");
                            }
                            onIssueUpdate(data as IssueDetail);
                          }}
                        />
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
                            aria-label="Task dependencies"
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
                        <StatusBadgeSelect
                          value={task.status}
                          options={taskStatuses}
                          label={statusLabel}
                          badgeClassName={taskStatusBadgeStyle}
                          disabled={taskStatusSaving[task.id]}
                          onChange={async (nextStatus) => {
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
                        />
                      </div>
                    </div>
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
                          users={users}
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
                                    dependencies: uniqueDependencies(draft.dependencies),
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
                  </div>
                ))}
              </div>
              {statusError && (
                <p className="text-xs text-rose-600">{statusError}</p>
              )}
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
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
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && event.ctrlKey) {
                          event.preventDefault();
                          void submitTaskDraft(phase);
                        }
                      }}
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <div
                        className="relative"
                        data-task-date-popover={`draft-${phase.id}`}
                      >
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
                        {openTaskDatePopover === `draft-${phase.id}` && (
                          <div
                            className="absolute left-1/2 top-full z-20 mt-2 inline-block w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-lg"
                            data-task-date-popover-content={`draft-${phase.id}`}
                            style={{
                              transform: `translateX(calc(-50% + ${taskDateShift}px))`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Dates
                              </p>
                              <button
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                                type="button"
                                onClick={() => setOpenTaskDatePopover(null)}
                              >
                                <Icon name="x" size={12} />
                              </button>
                            </div>
                    <DateRangePicker
                      startValue={getTaskDraft(phase.id).startDate}
                      endValue={getTaskDraft(phase.id).dueDate}
                      endMax={phaseDeadlineLimit ?? undefined}
                      onChange={({ start, end }) =>
                        updateTaskDraft(phase.id, {
                          startDate: start,
                          dueDate: end,
                        })
                      }
                      onCancel={() => setOpenTaskDatePopover(null)}
                      onClear={() =>
                        updateTaskDraft(phase.id, { startDate: "", dueDate: "" })
                      }
                    />
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
                      </div>
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
                          aria-label="Draft task dependencies"
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
                      <UserBadgeSelect
                        value={getTaskDraft(phase.id).assigneeId}
                        users={users}
                        label="Assignee"
                        ariaLabel="Assign task"
                        onRequestUsers={onRequestUsers}
                        onSave={(nextId) => {
                          updateTaskDraft(phase.id, { assigneeId: nextId ?? "" });
                        }}
                      />
                    </div>
                  </div>
                </div>
                {openTaskDependencyPopover === `draft-${phase.id}` && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dependencies
                    </p>
                    <DependencyPicker
                      issue={issue}
                      users={users}
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
            </div>
          );
        })}
    </div>
  );
}
