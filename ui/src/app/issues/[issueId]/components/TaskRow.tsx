"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";
import { StatusBadgeSelect } from "@/components/status-badge-select";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { DateRangePopover } from "./DateRangePopover";
import {
  DependencyBadge,
  DependencyPicker,
  type DependencySearchState,
} from "./DependencyPicker";
import type { IssueDetail, Task, UserOption } from "../types";
import {
  isDateRangeValid,
  isOnOrBefore,
  statusLabel,
  taskCardClass,
  taskStatusBadgeStyle,
  taskStatuses,
  worstStatus,
} from "./phase-board-utils";

type TaskMetaDraft = {
  startDate: string;
  dueDate: string;
  assigneeId: string;
  dependencies: { type: string; targetId: string }[];
};

type TaskRowProps = {
  task: Task;
  issue: IssueDetail;
  users: UserOption[];
  taskMeta: TaskMetaDraft;
  phaseDeadlineLimit: string | null;
  openDatePopover: boolean;
  datePopoverShift: number;
  openDependencyPopover: boolean;
  dependencyState: DependencySearchState;
  dependencyIssues: Record<string, IssueDetail>;
  onToggleDatePopover: () => void;
  onToggleDependencyPopover: () => void;
  onCancelDatePopover: () => void;
  onUpdateTaskMeta: (next: Partial<TaskMetaDraft>) => void;
  onSaveDates: () => Promise<void>;
  onClearDates: () => Promise<void>;
  onSaveAssignee: (nextId: string | null) => Promise<void>;
  onChangeStatus: (nextStatus: string) => Promise<void>;
  onRemoveDependency: (index: number) => void;
  onSearchDependencies: (query: string) => void;
  onAddDependency: (dep: { type: string; targetId: string }) => void;
  ensureIssueDetail: (issueId: string) => Promise<IssueDetail | null>;
  setDependencyState: (updater: (current: DependencySearchState) => DependencySearchState) => void;
  dependencyBadgeStyle: (kind: string, status?: string | null) => string;
  dependencyStatus: (dep: { type?: string | null; targetId?: string | null }) => string | null;
  dependencyHref: (dep: { type?: string | null; targetId?: string | null }) => string | undefined;
  formatDependency: (dep: { type?: string | null; targetId?: string | null }) => {
    label: string;
    tooltip: ReactNode;
    style: string;
  };
  taskStatusSaving: boolean;
  onSaveDependencies: () => Promise<void>;
  onCloseDependencies: () => void;
  onRequestUsers?: () => void;
};

export function TaskRow({
  task,
  issue,
  users,
  taskMeta,
  phaseDeadlineLimit,
  openDatePopover,
  datePopoverShift,
  openDependencyPopover,
  dependencyState,
  dependencyIssues,
  onToggleDatePopover,
  onToggleDependencyPopover,
  onCancelDatePopover,
  onUpdateTaskMeta,
  onSaveDates,
  onClearDates,
  onSaveAssignee,
  onChangeStatus,
  onRemoveDependency,
  onSearchDependencies,
  onAddDependency,
  ensureIssueDetail,
  setDependencyState,
  dependencyBadgeStyle,
  dependencyStatus,
  dependencyHref,
  formatDependency,
  taskStatusSaving,
  onSaveDependencies,
  onCloseDependencies,
  onRequestUsers,
}: TaskRowProps) {
  const dateWarning = !isOnOrBefore(taskMeta.dueDate, phaseDeadlineLimit)
    ? "Due date must be on or before the phase or issue deadline."
    : !isDateRangeValid(taskMeta.startDate, taskMeta.dueDate)
      ? "Due date must be after the start date."
      : null;

  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-slate-700 ${taskCardClass(task)}`}>
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
              onClick={onToggleDatePopover}
            >
              <Icon name="calendar" size={12} />
              {task.startDate || task.dueDate
                ? `${task.startDate ?? "—"} → ${task.dueDate ?? "—"}`
                : "Dates"}
            </button>
          </Tooltip>
          <DateRangePopover
            open={openDatePopover}
            shift={datePopoverShift}
            contentId={task.id}
            startValue={taskMeta.startDate}
            endValue={taskMeta.dueDate}
            endMax={phaseDeadlineLimit ?? undefined}
            onChange={(start, end) =>
              onUpdateTaskMeta({ startDate: start, dueDate: end })
            }
            onCancel={onCancelDatePopover}
            onClear={onClearDates}
            onSave={onSaveDates}
            warning={dateWarning}
          />
        </div>
        <UserBadgeSelect
          value={task.assigneeId}
          users={users}
          label="Assignee"
          ariaLabel="Change assignee"
          onRequestUsers={onRequestUsers}
          onSave={onSaveAssignee}
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
                    worstStatus(task.dependencies.map((dep) => dependencyStatus(dep))),
                  )
                : "border-slate-200 bg-white text-slate-500"
            }`}
            type="button"
            aria-label="Task dependencies"
            onClick={onToggleDependencyPopover}
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
          disabled={taskStatusSaving}
          onChange={onChangeStatus}
        />
      </div>
      {openDependencyPopover && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dependencies
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            {taskMeta.dependencies.map((dep, depIndex) => (
              <DependencyBadge
                key={`${dep.type}-${dep.targetId}-${depIndex}`}
                label={formatDependency(dep).label}
                tooltip={formatDependency(dep).tooltip}
                style={formatDependency(dep).style}
                href={dependencyHref(dep)}
                onRemove={() => onRemoveDependency(depIndex)}
              />
            ))}
            {taskMeta.dependencies.length === 0 && (
              <span className="text-slate-400">No dependencies yet.</span>
            )}
          </div>
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
          <div className="mt-2 flex justify-end gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              type="button"
              onClick={onCloseDependencies}
            >
              <Icon name="x" size={12} />
              Close
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
              type="button"
              onClick={() => void onSaveDependencies()}
            >
              <Icon name="check" size={12} />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
