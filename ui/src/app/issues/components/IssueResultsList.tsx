"use client";

import { IssueSummaryCard } from "@/components/issue-summary-card";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { Icon } from "@/components/icons";
import { IssueProgressBar } from "@/components/issue-progress-bar";
import Link from "next/link";
import type { IssueDetail } from "../[issueId]/types";
import type { IssueSummary, UserOption } from "../types";
import {
  formatDate,
  issueOverdueClass,
  issuePhaseSegments,
  issueProgressTone,
  issueStatusBadgeStyle,
  issueStatusLabel,
  phaseCardClass,
  phaseLabel,
  phaseOrder,
  phaseProgressSegments,
  userLabel,
} from "../issue-list-utils";
import { buildIssuePhaseSegments } from "../[issueId]/progress";

type IssueResultsListProps = {
  issues: IssueSummary[];
  issueDetails: Record<string, IssueDetail>;
  users: UserOption[];
  ready: boolean;
  isAuthed: boolean;
  onRequestUsers: () => Promise<void>;
  onUpdateOwner: (issueId: string, ownerId: string | null) => Promise<void>;
  onToggleIssue: (issueId: string) => void;
  onTogglePhase: (issueId: string, phaseId: string) => void;
  isIssueExpanded: (issueId: string) => boolean;
  isPhaseExpanded: (issueId: string, phaseId: string) => boolean;
};

const issueTooltip = (
  detail: IssueDetail | null,
  fallback: IssueSummary,
  users: UserOption[],
) => {
  if (!detail) {
    return fallback.title ?? fallback.id;
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
        <div className="text-[11px] text-slate-600">— → {detail.deadline}</div>
      )}
      {detail.phases.length > 0 && (
        <IssueProgressBar
          progressSegments={buildIssuePhaseSegments(detail, (id) => userLabel(users, id)) ?? undefined}
          progressTotal={1}
        />
      )}
    </div>
  );
};

const IssueDetailDrilldown = ({
  detail,
  users,
  onTogglePhase,
  isPhaseExpanded,
}: {
  detail: IssueDetail;
  users: UserOption[];
  onTogglePhase: (issueId: string, phaseId: string) => void;
  isPhaseExpanded: (issueId: string, phaseId: string) => boolean;
}) => {
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
          <Link
            key={phase.id}
            className={`block rounded-lg border px-3 py-2 ${phaseCardClass(
              phase,
              "border-slate-100",
            )}`}
            href={`/issues/${detail.id}#phase-${phase.id}`}
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
                        onTogglePhase(detail.id, phase.id);
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
                      {userLabel(users, phase.assigneeId)}
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
                        detail.deadline ?? null,
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
                  <Link
                    key={task.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600"
                    href={`/issues/${detail.id}`}
                  >
                    <Icon name="plus" size={12} />
                    {task.title}
                  </Link>
                ))}
                {phase.tasks.length === 0 && (
                  <span className="text-[11px] text-slate-400">No tasks yet.</span>
                )}
              </div>
            )}
          </Link>
        ))}
    </div>
  );
};

export function IssueResultsList({
  issues,
  issueDetails,
  users,
  ready,
  isAuthed,
  onRequestUsers,
  onUpdateOwner,
  onToggleIssue,
  onTogglePhase,
  isIssueExpanded,
  isPhaseExpanded,
}: IssueResultsListProps) {
  return (
    <>
      {issues.map((issue) => {
        const detail = issueDetails[issue.id] ?? null;
        return (
          <IssueSummaryCard
            key={issue.id}
            id={issue.id}
            title={issue.title ?? issue.id}
            href={`/issues/${issue.id}`}
            className={issueOverdueClass(issue.status, issue.deadline)}
            showDescription
            description={
              issue.description
                ? issue.description.length > 160
                  ? `${issue.description.slice(0, 160)}…`
                  : issue.description
                : undefined
            }
            descriptionTooltip={issue.description ?? undefined}
            tooltip={issueTooltip(detail, issue, users)}
            progressSegments={
              issuePhaseSegments(issue.phaseProgress, users, issue.deadline) ??
              undefined
            }
            progressTotal={1}
            progressTone={issue.phaseCount > 0 ? undefined : issueProgressTone(issue.status)}
            left={
              issue.phaseCount > 0 ? (
                <button
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-600"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleIssue(issue.id);
                  }}
                  aria-label={
                    isIssueExpanded(issue.id) ? "Collapse issue" : "Expand issue"
                  }
                >
                  <Icon
                    name={isIssueExpanded(issue.id) ? "chevron-down" : "chevron-right"}
                    size={12}
                  />
                </button>
              ) : (
                <span className="h-6 w-6" aria-hidden />
              )
            }
            right={
              <div
                className="flex items-center gap-2"
                data-no-link
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <UserBadgeSelect
                  value={issue.ownerId}
                  users={users}
                  label="Owner"
                  ariaLabel="Change owner"
                  onRequestUsers={async () => {
                    if (!ready || !isAuthed) {
                      return;
                    }
                    await onRequestUsers();
                  }}
                  onSave={(nextId) => onUpdateOwner(issue.id, nextId)}
                />
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${issueStatusBadgeStyle(
                    issue.status,
                  )}`}
                >
                  {issueStatusLabel(issue.status)}
                </span>
              </div>
            }
          >
            {isIssueExpanded(issue.id) && detail && (
              <IssueDetailDrilldown
                detail={detail}
                users={users}
                onTogglePhase={onTogglePhase}
                isPhaseExpanded={isPhaseExpanded}
              />
            )}
            {isIssueExpanded(issue.id) && !detail && (
              <p className="mt-2 text-[11px] text-slate-400">
                Loading issue details…
              </p>
            )}
          </IssueSummaryCard>
        );
      })}
    </>
  );
}
