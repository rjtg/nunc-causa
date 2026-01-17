"use client";

import { IssueProgressBar } from "@/components/issue-progress-bar";
import type { Phase } from "../types";
import { buildTaskSegments } from "../progress";
import { phaseProgress, phaseStatusBadges } from "./phase-board-utils";

type PhaseProgressProps = {
  phase: Phase;
  issueDeadline?: string | null;
};

export function PhaseProgress({ phase, issueDeadline }: PhaseProgressProps) {
  if (phase.tasks.length === 0) {
    return null;
  }

  const progress = phaseProgress(phase.tasks);
  const statusBadges = phaseStatusBadges(progress);

  return (
    <div className="mt-3">
      <IssueProgressBar
        progressSegments={buildTaskSegments(phase.tasks, false, statusBadges, {
          phaseDeadline: phase.deadline ?? null,
          issueDeadline: issueDeadline ?? null,
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
}
