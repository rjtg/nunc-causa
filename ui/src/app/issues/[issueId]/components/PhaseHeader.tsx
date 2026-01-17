"use client";

import { Icon } from "@/components/icons";
import { StatusBadgeSelect } from "@/components/status-badge-select";
import { UserBadgeSelect } from "@/components/user-badge-select";
import type { IssueDetail, Phase, UserOption } from "../types";
import {
  phaseLabel,
  phaseOptionColor,
  phaseStatusStyle,
  phaseStatuses,
  statusLabel,
} from "./phase-board-utils";
import { DatePopover } from "./DatePopover";

type PhaseHeaderProps = {
  phase: Phase;
  issue: IssueDetail;
  users: UserOption[];
  statusSaving: boolean;
  deadlineOpen: boolean;
  deadlineShift: number;
  deadlineDraft: string;
  deadlineWarning: string | null;
  onToggleDeadline: () => void;
  onCloseDeadline: () => void;
  onDeadlineChange: (value: string) => void;
  onSaveDeadline: () => void | Promise<void>;
  onStatusChange: (nextStatus: string) => void | Promise<void>;
  onRequestUsers?: () => void;
  onSaveAssignee: (nextId: string | null) => Promise<void>;
};

export function PhaseHeader({
  phase,
  issue,
  users,
  statusSaving,
  deadlineOpen,
  deadlineShift,
  deadlineDraft,
  deadlineWarning,
  onToggleDeadline,
  onCloseDeadline,
  onDeadlineChange,
  onSaveDeadline,
  onStatusChange,
  onRequestUsers,
  onSaveAssignee,
}: PhaseHeaderProps) {
  return (
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
              onClick={onToggleDeadline}
            >
              <Icon name="calendar" size={12} />
              {phase.deadline ?? "Deadline"}
            </button>
            <DatePopover
              open={deadlineOpen}
              shift={deadlineShift}
              contentId={phase.id}
              label="Phase deadline"
              value={deadlineDraft}
              max={issue.deadline ?? undefined}
              warning={deadlineWarning}
              onClose={onCloseDeadline}
              onChange={onDeadlineChange}
              onClear={() => onDeadlineChange("")}
              onSave={onSaveDeadline}
            />
          </div>
          <StatusBadgeSelect
            value={phase.status}
            options={phaseStatuses}
            label={statusLabel}
            badgeClassName={phaseStatusStyle}
            optionClassName={phaseOptionColor}
            disabled={statusSaving}
            onChange={(nextStatus) => void onStatusChange(nextStatus)}
          />
          <UserBadgeSelect
            value={phase.assigneeId}
            users={users}
            label="Assignee"
            ariaLabel="Change assignee"
            onRequestUsers={onRequestUsers}
            onSave={onSaveAssignee}
          />
        </div>
        {phase.status === "DONE" && phase.completionComment && (
          <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <p className="font-semibold text-emerald-800">Completion note</p>
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
      <div className="text-xs text-slate-500">{phase.tasks.length} tasks</div>
    </div>
  );
}
