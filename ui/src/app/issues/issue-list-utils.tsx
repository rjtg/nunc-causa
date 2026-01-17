"use client";

import type { IssueDetail } from "./[issueId]/types";
import type { IssueSummary, UserOption } from "./types";
import { buildTaskSegments, isPastDeadline, segmentClass, segmentStyle } from "./[issueId]/progress";
import type { ReactNode } from "react";

export const userLabel = (users: UserOption[], userId?: string | null) => {
  if (!userId) {
    return "Unassigned";
  }
  return users.find((user) => user.id === userId)?.displayName ?? userId;
};

export const issueStatusLabel = (value: string) => {
  if (value === "NOT_ACTIVE") {
    return "Not active";
  }
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const issueStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "DONE":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    case "FAILED":
      return "border-rose-200 bg-rose-100 text-rose-800";
    case "IN_ANALYSIS":
      return "border-amber-200 bg-amber-100 text-amber-800";
    case "IN_DEVELOPMENT":
      return "border-sky-200 bg-sky-100 text-sky-800";
    case "IN_TEST":
      return "border-violet-200 bg-violet-100 text-violet-800";
    case "IN_ROLLOUT":
      return "border-emerald-200 bg-emerald-100 text-emerald-800";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

export const issueProgressTone = (status: string) => {
  switch (status) {
    case "DONE":
      return "bg-emerald-500";
    case "FAILED":
      return "bg-rose-500";
    case "IN_ANALYSIS":
      return "bg-amber-400";
    case "IN_DEVELOPMENT":
      return "bg-sky-400";
    case "IN_TEST":
      return "bg-violet-400";
    case "IN_ROLLOUT":
      return "bg-emerald-500";
    default:
      return "bg-slate-300";
  }
};

export const issueOverdueClass = (status: string, deadline?: string | null) => {
  if (status === "DONE" || status === "FAILED") {
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

const segmentStyleWithOverdue = (status: string, overdue: boolean) => {
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

const buildPhaseTaskSegments = (
  counts: Record<string, number>,
  overdue: boolean,
) => {
  return [
    { key: "DONE" },
    { key: "IN_PROGRESS" },
    { key: "PAUSED" },
    { key: "ABANDONED" },
    { key: "NOT_STARTED" },
  ]
    .map((segment) => {
      const count = counts[segment.key] ?? 0;
      if (count <= 0) {
        return null;
      }
      return {
        ...segmentStyleWithOverdue(segment.key, overdue),
        count,
      };
    })
    .filter(Boolean) as Array<ReturnType<typeof segmentStyleWithOverdue> & { count: number }>;
};

export const issuePhaseSegments = (
  phases: IssueSummary["phaseProgress"],
  users: UserOption[],
  issueDeadline?: string | null,
) => {
  if (!phases || phases.length === 0) {
    return undefined;
  }
  const sortedPhases = [...phases].sort((a, b) => {
    const orderA = phaseOrder.indexOf(a.phaseKind ?? "");
    const orderB = phaseOrder.indexOf(b.phaseKind ?? "");
    if (orderA === -1 && orderB === -1) {
      return a.phaseName.localeCompare(b.phaseName);
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
        <p className="text-xs font-semibold text-slate-800">{phase.phaseName}</p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2 py-0.5 text-violet-700">
            {userLabel(users, phase.assigneeId)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
            {phase.taskTotal} tasks
          </span>
          {phase.deadline && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-sky-700">
              Due {phase.deadline}
            </span>
          )}
        </div>
      </div>
    );
    const overdue =
      isPastDeadline(phase.deadline ?? issueDeadline ?? null) &&
      phase.status !== "DONE" &&
      phase.status !== "FAILED";
    if (!phase.taskTotal) {
      const phaseTone = overdue
        ? segmentStyleWithOverdue(phase.status, true)
        : { color: segmentClass(phase.status) };
      return [
        {
          color: phaseTone.color,
          style: phaseTone.style,
          count: phaseWeight,
          tooltip,
          separator: phaseIndex > 0,
        },
      ];
    }
    const counts = phase.taskStatusCounts ?? {};
    return [
      {
        color: "bg-transparent",
        count: phaseWeight,
        tooltip,
        separator: phaseIndex > 0,
        segments: buildPhaseTaskSegments(counts, overdue),
      },
    ];
  });
};

export const phaseOrder = [
  "INVESTIGATION",
  "PROPOSE_SOLUTION",
  "DEVELOPMENT",
  "ACCEPTANCE_TEST",
  "ROLLOUT",
];

export const phaseLabel = (phase: IssueDetail["phases"][number]) =>
  phase.kind
    ? phase.kind
        .split("_")
        .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
        .join(" ")
    : phase.name;

export const formatDate = (value?: string | null) => value ?? "";

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

export const phaseCardClass = (phase: IssueDetail["phases"][number], borderBase: string) => {
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

const phaseProgress = (tasks: IssueDetail["phases"][number]["tasks"]) => {
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

export const phaseProgressSegments = (
  phase: IssueDetail["phases"][number],
  issueDeadline?: string | null,
) => {
  if (phase.tasks.length === 0) {
    const overdue =
      isPastDeadline(phase.deadline ?? issueDeadline ?? null) &&
      phase.status !== "DONE" &&
      phase.status !== "FAILED";
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
