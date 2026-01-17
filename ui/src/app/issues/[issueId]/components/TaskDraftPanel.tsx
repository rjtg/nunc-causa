"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { DateRangePopover } from "./DateRangePopover";
import { DependencyBadge, DependencyPicker, type DependencySearchState } from "./DependencyPicker";
import type { IssueDetail, UserOption } from "../types";

export type TaskDraft = {
  title: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  dependencies: { type: string; targetId: string }[];
  saving: boolean;
  error: string | null;
};

type TaskDraftPanelProps = {
  phaseId: string;
  issue: IssueDetail;
  users: UserOption[];
  draft: TaskDraft;
  datePopoverOpen: boolean;
  datePopoverShift: number;
  dependencyPopoverOpen: boolean;
  dependencyState: DependencySearchState;
  dependencyIssues: Record<string, IssueDetail>;
  dateWarning: string | null;
  endMax?: string | null;
  onTitleChange: (value: string) => void;
  onAssigneeChange: (nextId: string | null) => void;
  onSubmit: () => void;
  onToggleDatePopover: () => void;
  onCloseDatePopover: () => void;
  onDateChange: (start: string, end: string) => void;
  onClearDates: () => void;
  onToggleDependencyPopover: () => void;
  onSearchDependencies: (query: string) => void;
  onAddDependency: (dep: { type: string; targetId: string }) => void;
  onRemoveDependency: (index: number) => void;
  setDependencyState: (
    updater: (current: DependencySearchState) => DependencySearchState,
  ) => void;
  ensureIssueDetail: (issueId: string) => Promise<IssueDetail | null>;
  dependencyButtonClass: string;
  dependencyHref: (dep: { type?: string | null; targetId?: string | null }) => string | undefined;
  formatDependency: (dep: { type?: string | null; targetId?: string | null }) => {
    label: string;
    tooltip: ReactNode;
    style: string;
  };
  onRequestUsers?: () => void;
};

export function TaskDraftPanel({
  phaseId,
  issue,
  users,
  draft,
  datePopoverOpen,
  datePopoverShift,
  dependencyPopoverOpen,
  dependencyState,
  dependencyIssues,
  dateWarning,
  endMax,
  onTitleChange,
  onAssigneeChange,
  onSubmit,
  onToggleDatePopover,
  onCloseDatePopover,
  onDateChange,
  onClearDates,
  onToggleDependencyPopover,
  onSearchDependencies,
  onAddDependency,
  onRemoveDependency,
  setDependencyState,
  ensureIssueDetail,
  dependencyButtonClass,
  dependencyHref,
  formatDependency,
  onRequestUsers,
}: TaskDraftPanelProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
        Add task
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-24 text-xs"
            placeholder="Task title"
            value={draft.title}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.ctrlKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <div className="relative" data-task-date-popover={`draft-${phaseId}`}>
              <Tooltip
                content={
                  draft.startDate || draft.dueDate
                    ? `Start: ${draft.startDate || "—"} · Due: ${draft.dueDate || "—"}`
                    : "Set dates"
                }
              >
                <button
                  className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    draft.startDate || draft.dueDate
                      ? "border-sky-200 bg-sky-100 text-sky-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                  type="button"
                  onClick={onToggleDatePopover}
                >
                  <Icon name="calendar" size={12} />
                  {(draft.startDate || draft.dueDate) && (
                    <span className="ml-1 text-[11px]">
                      {draft.startDate || "—"} → {draft.dueDate || "—"}
                    </span>
                  )}
                </button>
              </Tooltip>
              <DateRangePopover
                open={datePopoverOpen}
                shift={datePopoverShift}
                contentId={`draft-${phaseId}`}
                startValue={draft.startDate}
                endValue={draft.dueDate}
                endMax={endMax ?? undefined}
                onChange={onDateChange}
                onCancel={onCloseDatePopover}
                onClear={onClearDates}
                onSave={onCloseDatePopover}
                warning={dateWarning}
              />
            </div>
            <Tooltip
              content={
                draft.dependencies.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dependencies
                    </p>
                    <ul className="space-y-1">
                      {draft.dependencies.map((dep, index) => (
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
                className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                  draft.dependencies.length > 0
                    ? dependencyButtonClass
                    : "border-slate-200 bg-white text-slate-500"
                }`}
                type="button"
                aria-label="Draft task dependencies"
                onClick={onToggleDependencyPopover}
              >
                <Icon name="link" size={12} />
                {draft.dependencies.length > 0 && (
                  <span className="ml-1 text-[11px]">
                    {draft.dependencies.length}
                  </span>
                )}
              </button>
            </Tooltip>
            <UserBadgeSelect
              value={draft.assigneeId}
              users={users}
              label="Assignee"
              ariaLabel="Assign task"
              onRequestUsers={onRequestUsers}
              onSave={onAssigneeChange}
            />
          </div>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          type="button"
          disabled={draft.saving}
          onClick={onSubmit}
        >
          <Icon name="plus" size={12} />
          <span className="ml-1">Add</span>
        </button>
      </div>
      {dependencyPopoverOpen && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dependencies
          </p>
          <DependencyPicker
            issue={issue}
            users={users}
            dependencyIssues={dependencyIssues}
            state={dependencyState}
            setState={setDependencyState}
            onSearch={onSearchDependencies}
            ensureIssueDetail={ensureIssueDetail}
            onAdd={onAddDependency}
          />
          {draft.dependencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              {draft.dependencies.map((dep, depIndex) => (
                <DependencyBadge
                  key={`${dep.type}-${dep.targetId}-${depIndex}`}
                  label={formatDependency(dep).label}
                  tooltip={formatDependency(dep).tooltip}
                  style={formatDependency(dep).style}
                  href={dependencyHref(dep)}
                  onRemove={() => onRemoveDependency(depIndex)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      {draft.error && <p className="mt-2 text-xs text-rose-600">{draft.error}</p>}
    </div>
  );
}
