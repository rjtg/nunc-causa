"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import type { IssueDetail, Phase, Task, UserOption } from "../types";
import type { createApiClient } from "@/lib/api/client";

type ApiClient = ReturnType<typeof createApiClient>;

type TaskDraft = {
  title: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  dependencyDraftType: string;
  dependencyDraftTarget: string;
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

type PhaseBoardProps = {
  issueId: string;
  issue: IssueDetail;
  api: ApiClient;
  users: UserOption[];
  onIssueUpdate: (issue: IssueDetail) => void;
  onDeadlineImpact?: (before: IssueDetail, after: IssueDetail) => void;
};

const phaseOrder = [
  "INVESTIGATION",
  "PROPOSE_SOLUTION",
  "DEVELOPMENT",
  "ACCEPTANCE_TEST",
  "ROLLOUT",
];

const phaseStatuses = ["NOT_STARTED", "IN_PROGRESS", "DONE", "FAILED"];
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

const statusLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

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

export function PhaseBoard({
  issueId,
  issue,
  api,
  users,
  onIssueUpdate,
  onDeadlineImpact,
}: PhaseBoardProps) {
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
  const [openTaskDatePopover, setOpenTaskDatePopover] = useState<string | null>(null);
  const [openTaskDependencyPopover, setOpenTaskDependencyPopover] = useState<string | null>(null);
  const [taskMetaDrafts, setTaskMetaDrafts] = useState<
    Record<string, { startDate: string; dueDate: string; dependencies: { type: string; targetId: string }[] }>
  >({});
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, CompletionDraft>>({});
  const [phaseStatusSaving, setPhaseStatusSaving] = useState<Record<string, boolean>>({});
  const [taskStatusSaving, setTaskStatusSaving] = useState<Record<string, boolean>>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [openPhaseDeadlinePopover, setOpenPhaseDeadlinePopover] = useState<string | null>(null);
  const [phaseDeadlineDrafts, setPhaseDeadlineDrafts] = useState<Record<string, string>>({});

  const getTaskDraft = (phaseId: string): TaskDraft =>
    taskDrafts[phaseId] ?? {
      title: "",
      assigneeId: "",
      startDate: "",
      dueDate: "",
      dependencyDraftType: "TASK",
      dependencyDraftTarget: "",
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
              className="rounded-2xl border border-slate-200/60 bg-white/90 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Status</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${phaseStatusStyle(
                        phase.status,
                      )}`}
                    >
                      {statusLabel(phase.status)}
                    </span>
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
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
                    <select
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                      value={phase.status}
                      disabled={phaseStatusSaving[phase.id]}
                      onChange={async (event) => {
                        const nextStatus = event.target.value;
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
                    >
                      {phaseStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {phaseLabel(phase)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Assignee: {phase.assigneeId}
                  </p>
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
              {openPhaseDeadlinePopover === phase.id && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Phase deadline
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <label className="text-[11px] text-slate-500">
                      Deadline
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        type="date"
                        max={issue.deadline ?? undefined}
                        value={getPhaseDeadlineDraft(phase)}
                        onChange={(event) =>
                          updatePhaseDeadlineDraft(phase.id, event.target.value)
                        }
                      />
                    </label>
                    {!isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline) && (
                      <p className="text-xs text-rose-600">
                        Phase deadline must be on or before the issue deadline.
                      </p>
                    )}
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="button"
                      disabled={
                        !isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline)
                      }
                      onClick={async () => {
                        const before = issue;
                        const { data, error: apiError } = await api.PATCH(
                          "/issues/{issueId}/phases/{phaseId}",
                          {
                            params: { path: { issueId, phaseId: phase.id } },
                            body: {
                              deadline: getPhaseDeadlineDraft(phase) || undefined,
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
                    >
                      <Icon name="check" size={12} />
                      Save
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                      type="button"
                      onClick={() => setOpenPhaseDeadlinePopover(null)}
                    >
                      <Icon name="x" size={12} />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {phase.tasks.length > 0 && (() => {
                const progress = phaseProgress(phase.tasks);
                const segments = [
                  { key: "NOT_STARTED", color: "bg-slate-300" },
                  { key: "IN_PROGRESS", color: "bg-sky-400" },
                  { key: "PAUSED", color: "bg-amber-400" },
                  { key: "ABANDONED", color: "bg-rose-400" },
                  { key: "DONE", color: "bg-emerald-500" },
                ];
                return (
                  <div className="mt-3">
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                      {segments.map((segment) => {
                        const count = progress.counts[segment.key] ?? 0;
                        const width =
                          progress.total > 0 ? (count / progress.total) * 100 : 0;
                        if (width <= 0) {
                          return null;
                        }
                        return (
                          <span
                            key={segment.key}
                            className={`${segment.color}`}
                            style={{ width: `${width}%` }}
                          />
                        );
                      })}
                    </div>
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
              <div className="mt-3 space-y-2">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="space-y-2">
                    <div
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-slate-700 ${taskStatusStyle(
                        task.status,
                      )}`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                          {task.startDate && <span>Start: {task.startDate}</span>}
                          {task.dueDate && <span>Due: {task.dueDate}</span>}
                          {task.dependencies && task.dependencies.length > 0 && (
                            <span>Depends on: {task.dependencies.length}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                            task.startDate || task.dueDate
                              ? "border-sky-200 bg-sky-100 text-sky-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          type="button"
                          title={
                            task.startDate || task.dueDate
                              ? `Start: ${task.startDate ?? "—"} · Due: ${task.dueDate ?? "—"}`
                              : "Set dates"
                          }
                          onClick={() =>
                            setOpenTaskDatePopover((current) =>
                              current === task.id ? null : task.id,
                            )
                          }
                        >
                          <Icon name="calendar" size={12} />
                          {task.startDate || task.dueDate ? "Dates" : "Dates"}
                        </button>
                        <button
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
                            task.dependencies && task.dependencies.length > 0
                              ? "border-amber-200 bg-amber-100 text-amber-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                          type="button"
                          title={
                            task.dependencies && task.dependencies.length > 0
                              ? `${task.dependencies.length} dependencies`
                              : "Set dependencies"
                          }
                          onClick={() =>
                            setOpenTaskDependencyPopover((current) =>
                              current === task.id ? null : task.id,
                            )
                          }
                        >
                          <Icon name="link" size={12} />
                          {task.dependencies && task.dependencies.length > 0
                            ? task.dependencies.length
                            : "Deps"}
                        </button>
                        <select
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                          value={task.status}
                          disabled={taskStatusSaving[task.id]}
                          onChange={async (event) => {
                            const nextStatus = event.target.value;
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
                        >
                          {taskStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {openTaskDatePopover === task.id && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Dates
                        </p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <label className="text-[11px] text-slate-500">
                            Start
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              type="date"
                              value={getTaskMetaDraft(task).startDate}
                              onChange={(event) =>
                                updateTaskMetaDraft(task, {
                                  startDate: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="text-[11px] text-slate-500">
                            Due
                            <input
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                              type="date"
                              max={phaseDeadlineLimit ?? undefined}
                              value={getTaskMetaDraft(task).dueDate}
                              onChange={(event) =>
                                updateTaskMetaDraft(task, {
                                  dueDate: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
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
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                            type="button"
                            onClick={() => setOpenTaskDatePopover(null)}
                          >
                            <Icon name="x" size={12} />
                            Close
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            type="button"
                            disabled={
                              !isDateRangeValid(
                                getTaskMetaDraft(task).startDate,
                                getTaskMetaDraft(task).dueDate,
                              ) ||
                              !isOnOrBefore(
                                getTaskMetaDraft(task).dueDate,
                                phaseDeadlineLimit,
                              )
                            }
                            onClick={async () => {
                              const draft = getTaskMetaDraft(task);
                              if (!isDateRangeValid(draft.startDate, draft.dueDate)) {
                                return;
                              }
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
                                    startDate: draft.startDate || undefined,
                                    dueDate: draft.dueDate || undefined,
                                  },
                                },
                              );
                              if (!apiError && data) {
                                onIssueUpdate(data as IssueDetail);
                                setOpenTaskDatePopover(null);
                              }
                            }}
                          >
                            <Icon name="check" size={12} />
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                    {openTaskDependencyPopover === task.id && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Dependencies
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                          {getTaskMetaDraft(task).dependencies.map((dep, depIndex) => (
                            <span
                              key={`${dep.type}-${dep.targetId}-${depIndex}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
                            >
                              <Icon name="link" size={12} />
                              {dep.type}:{dep.targetId}
                              <button
                                className="inline-flex items-center"
                                type="button"
                                onClick={() => {
                                  const nextDeps = getTaskMetaDraft(task).dependencies.filter(
                                    (_, index) => index !== depIndex,
                                  );
                                  updateTaskMetaDraft(task, { dependencies: nextDeps });
                                }}
                              >
                                <Icon name="x" size={12} />
                              </button>
                            </span>
                          ))}
                          {getTaskMetaDraft(task).dependencies.length === 0 && (
                            <span className="text-slate-400">No dependencies yet.</span>
                          )}
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)_auto]">
                          <select
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            value={getTaskMetaDraft(task).dependencies[0]?.type ?? "TASK"}
                            onChange={(event) => {
                              const current = getTaskMetaDraft(task).dependencies[0];
                              const next = {
                                type: event.target.value,
                                targetId: current?.targetId ?? "",
                              };
                              const rest = getTaskMetaDraft(task).dependencies.slice(1);
                              updateTaskMetaDraft(task, { dependencies: [next, ...rest] });
                            }}
                          >
                            <option value="TASK">Task</option>
                            <option value="PHASE">Phase</option>
                            <option value="ISSUE">Issue</option>
                          </select>
                          <input
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                            placeholder="Target ID"
                            value={getTaskMetaDraft(task).dependencies[0]?.targetId ?? ""}
                            onChange={(event) => {
                              const current = getTaskMetaDraft(task).dependencies[0] ?? {
                                type: "TASK",
                                targetId: "",
                              };
                              const rest = getTaskMetaDraft(task).dependencies.slice(1);
                              updateTaskMetaDraft(task, {
                                dependencies: [{ ...current, targetId: event.target.value }, ...rest],
                              });
                            }}
                          />
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                            type="button"
                            onClick={() => {
                              const [first, ...rest] = getTaskMetaDraft(task).dependencies;
                              if (!first || !first.targetId.trim()) {
                                return;
                              }
                              updateTaskMetaDraft(task, {
                                dependencies: [
                                  ...rest,
                                  { type: first.type, targetId: first.targetId.trim() },
                                ],
                              });
                            }}
                          >
                            <Icon name="plus" size={12} />
                            Add dependency
                          </button>
                        </div>
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
                                    dependencies: draft.dependencies,
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                    />
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <button
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                          getTaskDraft(phase.id).startDate ||
                          getTaskDraft(phase.id).dueDate
                            ? "border-sky-200 bg-sky-100 text-sky-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                        type="button"
                        title="Set dates"
                        onClick={() =>
                          setOpenTaskDatePopover((current) =>
                            current === `draft-${phase.id}` ? null : `draft-${phase.id}`,
                          )
                        }
                      >
                        <Icon name="calendar" size={12} />
                      </button>
                      <button
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${
                          getTaskDraft(phase.id).dependencies.length > 0
                            ? "border-amber-200 bg-amber-100 text-amber-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                        type="button"
                        title="Set dependencies"
                        onClick={() =>
                          setOpenTaskDependencyPopover((current) =>
                            current === `draft-${phase.id}` ? null : `draft-${phase.id}`,
                          )
                        }
                      >
                        <Icon name="link" size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="relative min-w-[180px]">
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      placeholder="Assignee ID"
                      value={getTaskDraft(phase.id).assigneeId}
                      list={`task-assignee-options-${phase.id}`}
                      onChange={(event) =>
                        updateTaskDraft(phase.id, {
                          assigneeId: event.target.value,
                        })
                      }
                    />
                    <span className="pointer-events-none absolute right-2 top-2 text-xs text-slate-400">
                      ▾
                    </span>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={getTaskDraft(phase.id).saving}
                    onClick={async () => {
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
                            dependencies: draft.dependencies,
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
                        dependencyDraftType: "TASK",
                        dependencyDraftTarget: "",
                        saving: false,
                        error: null,
                      });
                      setOpenTaskDatePopover(null);
                      setOpenTaskDependencyPopover(null);
                    }}
                  >
                    <Icon name="plus" size={12} />
                    {getTaskDraft(phase.id).saving ? "Adding…" : "Add"}
                  </button>
                </div>
                {openTaskDatePopover === `draft-${phase.id}` && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dates
                    </p>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <label className="text-[11px] text-slate-500">
                        Start
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          type="date"
                          value={getTaskDraft(phase.id).startDate}
                          onChange={(event) =>
                            updateTaskDraft(phase.id, {
                              startDate: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="text-[11px] text-slate-500">
                        Due
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          type="date"
                          max={phaseDeadlineLimit ?? undefined}
                          value={getTaskDraft(phase.id).dueDate}
                          onChange={(event) =>
                            updateTaskDraft(phase.id, {
                              dueDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
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
                {openTaskDependencyPopover === `draft-${phase.id}` && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dependencies
                    </p>
                    <div className="mt-2 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)_auto]">
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        value={getTaskDraft(phase.id).dependencyDraftType}
                        onChange={(event) =>
                          updateTaskDraft(phase.id, {
                            dependencyDraftType: event.target.value,
                          })
                        }
                      >
                        <option value="TASK">Task</option>
                        <option value="PHASE">Phase</option>
                        <option value="ISSUE">Issue</option>
                      </select>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        placeholder="Target ID"
                        value={getTaskDraft(phase.id).dependencyDraftTarget}
                        onChange={(event) =>
                          updateTaskDraft(phase.id, {
                            dependencyDraftTarget: event.target.value,
                          })
                        }
                      />
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                        type="button"
                        onClick={() => {
                          const draft = getTaskDraft(phase.id);
                          if (!draft.dependencyDraftTarget.trim()) {
                            return;
                          }
                          updateTaskDraft(phase.id, {
                            dependencies: [
                              ...draft.dependencies,
                              {
                                type: draft.dependencyDraftType,
                                targetId: draft.dependencyDraftTarget.trim(),
                              },
                            ],
                            dependencyDraftTarget: "",
                          });
                        }}
                      >
                        <Icon name="plus" size={12} />
                        Add dependency
                      </button>
                    </div>
                    {getTaskDraft(phase.id).dependencies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                        {getTaskDraft(phase.id).dependencies.map((dep, depIndex) => (
                          <span
                            key={`${dep.type}-${dep.targetId}-${depIndex}`}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
                          >
                            <Icon name="link" size={12} />
                            {dep.type}:{dep.targetId}
                            <button
                              className="inline-flex items-center"
                              type="button"
                              onClick={() => {
                                const nextDeps = getTaskDraft(phase.id).dependencies.filter(
                                  (_, index) => index !== depIndex,
                                );
                                updateTaskDraft(phase.id, { dependencies: nextDeps });
                              }}
                            >
                              <Icon name="x" size={12} />
                            </button>
                          </span>
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
              <datalist id={`task-assignee-options-${phase.id}`}>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </datalist>
            </div>
          );
        })}
    </div>
  );
}
