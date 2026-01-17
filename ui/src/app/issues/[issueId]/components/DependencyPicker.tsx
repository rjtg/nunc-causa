"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { IssueSummaryCard } from "@/components/issue-summary-card";
import { IssueProgressBar } from "@/components/issue-progress-bar";
import type { IssueDetail, UserOption } from "../types";
import { buildIssuePhaseSegments } from "../progress";
import {
  formatDate,
  issueOverdueClass,
  phaseCardClass,
  phaseLabel,
  phaseOrder,
  userLabel as resolveUserLabel,
} from "../../issue-list-utils";
import { phaseProgressSegments } from "./phase-board-utils";

export type IssueSummary = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  deadline?: string | null;
};

export type DependencySearchState = {
  query: string;
  results: IssueSummary[];
  loading: boolean;
  error: string | null;
  expandedIssues: string[];
  expandedPhases: Record<string, string[]>;
};

export const createDependencyState = (): DependencySearchState => ({
  query: "",
  results: [],
  loading: false,
  error: null,
  expandedIssues: [],
  expandedPhases: {},
});

export const DependencyBadge = ({
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

export const DependencyPicker = ({
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

  const userLabel = (userId?: string | null) => resolveUserLabel(users, userId);

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
      return <p className="text-[11px] text-slate-400">No phases available.</p>;
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
                      {phase.tasks.length} task{phase.tasks.length === 1 ? "" : "s"}
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
        {issuesToShow.map((summary) => {
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
              note={isCurrent ? "Current issue" : undefined}
              tone={isCurrent ? "muted" : "default"}
              tooltip={issueTooltip(detail ?? null, summary)}
              progressSegments={
                buildIssuePhaseSegments(detail ?? null, userLabel) ?? undefined
              }
              progressTotal={1}
              onSelect={() => onAdd({ type: "ISSUE", targetId: summary.id })}
              className={issueOverdueClass(
                detail?.status ?? summary.status ?? "UNKNOWN",
                detail?.deadline ?? summary.deadline,
              )}
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
                    aria-label={
                      isIssueExpanded(summary.id) ? "Collapse issue" : "Expand issue"
                    }
                  >
                    <Icon
                      name={
                        isIssueExpanded(summary.id) ? "chevron-down" : "chevron-right"
                      }
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
