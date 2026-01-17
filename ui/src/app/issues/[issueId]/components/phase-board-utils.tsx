"use client";

import type { ReactNode } from "react";
import type { Phase, Task } from "../types";
import { buildTaskSegments, isPastDeadline, segmentStyle } from "../progress";

export const phaseOrder = [
  "INVESTIGATION",
  "PROPOSE_SOLUTION",
  "DEVELOPMENT",
  "ACCEPTANCE_TEST",
  "ROLLOUT",
];

export const phaseStatuses = ["NOT_STARTED", "IN_PROGRESS", "DONE", "FAILED"];

export const phaseOptionColor = (status: string) => {
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

export const taskStatuses = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PAUSED",
  "ABANDONED",
  "DONE",
];

export const taskStatusStyle = (status: string) => {
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

export const taskStatusBadgeStyle = (status: string) => {
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

export const issueOverdueClass = (status?: string | null, deadline?: string | null) => {
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

export const taskCardClass = (task: Task) => {
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

export const phaseStatusStyle = (status: string) => {
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

export const phaseCardClass = (phase: Phase, borderBase: string) => {
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

export const issueStatusStyle = (status: string) => phaseStatusStyle(status);

export const statusSeverityOrder: Record<string, number> = {
  FAILED: 5,
  ABANDONED: 4,
  PAUSED: 3,
  IN_PROGRESS: 2,
  NOT_STARTED: 1,
  DONE: 0,
};

export const worstStatus = (statuses: Array<string | null | undefined>) => {
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

export const isDateRangeValid = (startDate?: string, dueDate?: string) => {
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

export const minIsoDate = (...dates: Array<string | null | undefined>) => {
  const valid = dates.filter((date): date is string => Boolean(date));
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((min, current) => {
    return new Date(current).getTime() < new Date(min).getTime() ? current : min;
  });
};

export const isOnOrBefore = (value?: string | null, limit?: string | null) => {
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

export const phaseProgress = (tasks: Task[]) => {
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

export const phaseStatusBadges = (progress: ReturnType<typeof phaseProgress>) => {
  const counts = progress.counts;
  const hasAny =
    counts.DONE +
      counts.IN_PROGRESS +
      counts.PAUSED +
      counts.ABANDONED +
      counts.NOT_STARTED >
    0;
  if (!hasAny) {
    return <span className="text-[11px] text-slate-500">No tasks yet.</span>;
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

export const phaseProgressSegments = (phase: Phase, issueDeadline?: string | null) => {
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

export const statusLabel = (value: string) => {
  if (value === "NOT_ACTIVE") {
    return "Not active";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const phaseLabel = (phase: Phase) => {
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
