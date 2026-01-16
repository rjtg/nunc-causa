"use client";

import type { ReactNode } from "react";
import type { IssueDetail, Task } from "./types";

export const isPastDeadline = (deadline?: string | null) => {
  if (!deadline) {
    return false;
  }
  const deadlineDate = new Date(`${deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate.getTime() < today.getTime();
};

export const isTaskOverdue = (task: Task) => {
  if (!task.dueDate) {
    return false;
  }
  if (task.status === "DONE" || task.status === "ABANDONED") {
    return false;
  }
  return isPastDeadline(task.dueDate);
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

export const segmentClass = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "IN_PROGRESS":
      return "bg-sky-400";
    case "PAUSED":
      return "bg-amber-400";
    case "ABANDONED":
      return "bg-rose-400";
    case "FAILED":
      return "bg-rose-400";
    default:
      return "bg-slate-300";
  }
};

export const segmentStyle = (status: string, overdue: boolean) => {
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

const taskStatusOrder = ["DONE", "IN_PROGRESS", "PAUSED", "ABANDONED", "NOT_STARTED"];

const taskStatusCounts = (tasks: Task[]) => {
  return tasks.reduce(
    (acc, task) => {
      acc.counts[task.status] = (acc.counts[task.status] ?? 0) + 1;
      if (isTaskOverdue(task)) {
        acc.overdue[task.status] = (acc.overdue[task.status] ?? 0) + 1;
      }
      return acc;
    },
    {
      counts: {} as Record<string, number>,
      overdue: {} as Record<string, number>,
    },
  );
};

export const buildTaskSegments = (
  tasks: Task[],
  normalized = false,
  tooltip?: ReactNode,
) => {
  const total = tasks.length;
  if (total === 0) {
    return [];
  }
  const { counts, overdue } = taskStatusCounts(tasks);
  return taskStatusOrder.flatMap((status) => {
    const count = counts[status] ?? 0;
    if (count === 0) {
      return [];
    }
    const overdueCount = overdue[status] ?? 0;
    const segments = [];
    const scale = (value: number) => (normalized ? value / total : value);
    if (overdueCount > 0) {
      segments.push({
        ...segmentStyle(status, true),
        count: scale(overdueCount),
        tooltip,
      });
    }
    if (count > overdueCount) {
      segments.push({
        ...segmentStyle(status, false),
        count: scale(count - overdueCount),
        tooltip,
      });
    }
    return segments;
  });
};

export const buildIssuePhaseSegments = (
  detail: IssueDetail | null,
  userLabel: (userId?: string | null) => string,
  onPhaseClick?: (phaseId: string) => void,
) => {
  if (!detail || detail.phases.length === 0) {
    return null;
  }
  const phaseOrder = [
    "INVESTIGATION",
    "PROPOSE_SOLUTION",
    "DEVELOPMENT",
    "ACCEPTANCE_TEST",
    "ROLLOUT",
  ];
  const sortedPhases = [...detail.phases].sort((a, b) => {
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
  });
  const phaseWeight = 1 / sortedPhases.length;
  return sortedPhases.flatMap((phase, phaseIndex) => {
    const tooltip = (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-800">{phaseLabel(phase)}</p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-violet-700">
            {userLabel(phase.assigneeId)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            {phase.tasks.length} tasks
          </span>
          {phase.deadline && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-sky-700">
              Due {phase.deadline}
            </span>
          )}
        </div>
      </div>
    );
    const onClick = onPhaseClick ? () => onPhaseClick(phase.id) : undefined;
    if (phase.tasks.length === 0) {
      return [
        {
          color: segmentClass(phase.status),
          count: phaseWeight,
          tooltip,
          separator: phaseIndex > 0,
          onClick,
        },
      ];
    }
    return [
      {
        color: "bg-transparent",
        count: phaseWeight,
        tooltip,
        separator: phaseIndex > 0,
        onClick,
        segments: buildTaskSegments(phase.tasks, true, tooltip),
      },
    ];
  });
};

const phaseLabel = (phase: IssueDetail["phases"][number]) =>
  phase.kind
    ? phase.kind
        .split("_")
        .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
        .join(" ")
    : phase.name;
