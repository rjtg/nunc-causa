"use client";

import { useEffect, useRef, useState } from "react";
import { IssueProgressBar } from "@/components/issue-progress-bar";
import type { IssueDetail, Phase, Task, UserOption } from "../types";
import type { createApiClient } from "@/lib/api/client";
import { buildIssuePhaseSegments, buildTaskSegments } from "../progress";
import {
  isDateRangeValid,
  isOnOrBefore,
  minIsoDate,
  phaseLabel,
  phaseOrder,
  taskStatusStyle,
  worstStatus,
  issueStatusStyle,
} from "./phase-board-utils";
import { createDependencyState, type DependencySearchState } from "./DependencyPicker";
import { PhaseProgress } from "./PhaseProgress";
import { PhaseCompletionPanel, type CompletionDraft } from "./PhaseCompletionPanel";
import { PhaseHeader } from "./PhaseHeader";
import { PhaseCard } from "./PhaseCard";
import { TaskDraftPanel } from "./TaskDraftPanel";
import { TaskRow } from "./TaskRow";
import { usePopoverShift } from "./use-popover-shift";

type ApiClient = ReturnType<typeof createApiClient>;

type TaskDraft = {
  title: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  dependencies: { type: string; targetId: string }[];
  saving: boolean;
  error: string | null;
};

type PhaseBoardProps = {
  issueId: string;
  issue: IssueDetail;
  api: ApiClient;
  users: UserOption[];
  onIssueUpdate: (issue: IssueDetail) => void;
  onDeadlineImpact?: (before: IssueDetail, after: IssueDetail) => void;
  onRequestUsers?: () => void;
};

const dependencyKey = (dep: { type?: string | null; targetId?: string | null }) =>
  `${dep.type ?? "TASK"}:${dep.targetId ?? ""}`;

const uniqueDependencies = (deps: { type: string; targetId: string }[]) => {
  const seen = new Set<string>();
  return deps.filter((dep) => {
    const key = dependencyKey(dep);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export function PhaseBoard({
  issueId,
  issue,
  api,
  users,
  onIssueUpdate,
  onDeadlineImpact,
  onRequestUsers,
}: PhaseBoardProps) {
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
  const [openTaskDatePopover, setOpenTaskDatePopover] = useState<string | null>(null);
  const [openTaskDependencyPopover, setOpenTaskDependencyPopover] = useState<string | null>(null);
  const [taskMetaDrafts, setTaskMetaDrafts] = useState<
    Record<
      string,
      {
        startDate: string;
        dueDate: string;
        assigneeId: string;
        dependencies: { type: string; targetId: string }[];
      }
    >
  >({});
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, CompletionDraft>>({});
  const [phaseStatusSaving, setPhaseStatusSaving] = useState<Record<string, boolean>>({});
  const [taskStatusSaving, setTaskStatusSaving] = useState<Record<string, boolean>>({});
  const [statusError, setStatusError] = useState<string | null>(null);
  const [openPhaseDeadlinePopover, setOpenPhaseDeadlinePopover] = useState<string | null>(null);
  const [phaseDeadlineDrafts, setPhaseDeadlineDrafts] = useState<Record<string, string>>({});
  const phaseDeadlineShift = usePopoverShift(
    openPhaseDeadlinePopover,
    "data-phase-deadline-popover-content",
  );
  const taskDateShift = usePopoverShift(
    openTaskDatePopover,
    "data-task-date-popover-content",
  );
  const [dependencySearch, setDependencySearch] = useState<Record<string, DependencySearchState>>({});
  const [dependencyIssues, setDependencyIssues] = useState<Record<string, IssueDetail>>({});

  const allIssues = [issue, ...Object.values(dependencyIssues)];
  const dependencyIndex = allIssues.reduce(
    (acc, currentIssue) => {
      acc.issueById[currentIssue.id] = currentIssue;
      currentIssue.phases.forEach((phase) => {
        acc.phaseById[phase.id] = phase;
        acc.issueForPhase[phase.id] = currentIssue.id;
        phase.tasks.forEach((task) => {
          acc.taskById[task.id] = task;
          acc.issueForTask[task.id] = currentIssue.id;
          acc.phaseForTask[task.id] = phase.id;
        });
      });
      return acc;
    },
    {
      issueById: {} as Record<string, IssueDetail>,
      phaseById: {} as Record<string, Phase>,
      taskById: {} as Record<string, Task>,
      issueForPhase: {} as Record<string, string>,
      issueForTask: {} as Record<string, string>,
      phaseForTask: {} as Record<string, string>,
    },
  );

  const userLabel = (userId?: string | null) => {
    if (!userId) {
      return "Unassigned";
    }
    return users.find((user) => user.id === userId)?.displayName ?? userId;
  };

  const userWorkload = (userId?: string | null) => {
    if (!userId) {
      return null;
    }
    const user = users.find((option) => option.id === userId);
    if (!user) {
      return null;
    }
    const openIssues = user.openIssueCount ?? 0;
    const openPhases = user.openPhaseCount ?? 0;
    const openTasks = user.openTaskCount ?? 0;
    return `${openIssues} / ${openPhases} / ${openTasks}`;
  };

  const getTaskDraft = (phaseId: string): TaskDraft =>
    taskDrafts[phaseId] ?? {
      title: "",
      assigneeId: "",
      startDate: "",
      dueDate: "",
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
      assigneeId: task.assigneeId ?? "",
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
      assigneeId: string;
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

  const getDependencyState = (key: string) =>
    dependencySearch[key] ?? createDependencyState();

  const setDependencyState = (
    key: string,
    updater: (current: DependencySearchState) => DependencySearchState,
  ) => {
    setDependencySearch((prev) => {
      const current = prev[key] ?? createDependencyState();
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  const updateDependencyState = (key: string, next: Partial<DependencySearchState>) => {
    setDependencyState(key, (current) => ({
      ...current,
      ...next,
    }));
  };

  const searchIssues = async (key: string, query: string) => {
    if (query.trim().length < 2) {
      updateDependencyState(key, {
        query,
        results: [],
        loading: false,
        error: null,
      });
      return;
    }
    updateDependencyState(key, { query, loading: true, error: null });
    const { data, error } = await api.GET("/search", {
      params: {
        query: {
          q: query,
          projectId: issue.projectId ?? undefined,
        },
      },
    });
    if (error) {
      updateDependencyState(key, {
        query,
        loading: false,
        error: "Unable to search issues.",
      });
      return;
    }
    const results = (data ?? []).map((item) => ({
      id: item.id ?? "unknown",
      title: item.title ?? "Untitled",
      description: item.description ?? null,
      status: item.status ?? null,
      deadline: item.deadline ?? null,
    }));
    updateDependencyState(key, { query, results, loading: false, error: null });
  };

  const ensureIssueDetail = async (issueId: string) => {
    if (dependencyIssues[issueId]) {
      return dependencyIssues[issueId];
    }
    const { data, error } = await api.GET("/issues/{issueId}", {
      params: { path: { issueId } },
    });
    if (!error && data) {
      const detail = data as IssueDetail;
      setDependencyIssues((prev) => ({ ...prev, [issueId]: detail }));
      return detail;
    }
    return null;
  };

  const addDependencyForTask = (task: Task, dep: { type: string; targetId: string }) => {
    const nextDeps = uniqueDependencies([...getTaskMetaDraft(task).dependencies, dep]);
    updateTaskMetaDraft(task, { dependencies: nextDeps });
  };

  const addDependencyForDraft = (phaseId: string, dep: { type: string; targetId: string }) => {
    const draft = getTaskDraft(phaseId);
    updateTaskDraft(phaseId, {
      dependencies: uniqueDependencies([...draft.dependencies, dep]),
    });
  };

  const submitTaskDraft = async (phase: Phase) => {
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
    const phaseDeadlineLimit = minIsoDate(issue.deadline, phase.deadline);
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
          dependencies: uniqueDependencies(draft.dependencies),
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
      saving: false,
      error: null,
    });
    setOpenTaskDatePopover(null);
    setOpenTaskDependencyPopover(null);
  };

  useEffect(() => {
    const issueDeps = new Set<string>();
    issue.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        task.dependencies?.forEach((dep) => {
          if ((dep.type ?? "TASK") === "ISSUE" && dep.targetId) {
            issueDeps.add(dep.targetId);
          }
        });
      });
    });
    issueDeps.forEach((depIssueId) => {
      if (!dependencyIssues[depIssueId]) {
        void ensureIssueDetail(depIssueId);
      }
    });
  }, [issue, dependencyIssues]);

  useEffect(() => {
    if (!openPhaseDeadlinePopover && !openTaskDatePopover) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        openPhaseDeadlinePopover &&
        target?.closest(`[data-phase-deadline-popover="${openPhaseDeadlinePopover}"]`)
      ) {
        return;
      }
      if (
        openTaskDatePopover &&
        target?.closest(`[data-task-date-popover="${openTaskDatePopover}"]`)
      ) {
        return;
      }
      if (openPhaseDeadlinePopover) {
        setOpenPhaseDeadlinePopover(null);
      }
      if (openTaskDatePopover) {
        setOpenTaskDatePopover(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [openPhaseDeadlinePopover, openTaskDatePopover]);

  const dependencyBadgeStyle = (kind: string, status?: string | null) => {
    if (!status) {
      return "border-slate-200 bg-white text-slate-600";
    }
    if (kind === "TASK") {
      return `${taskStatusStyle(status)} text-slate-700`;
    }
    return issueStatusStyle(status);
  };

  const dependencyStatus = (dep: { type?: string | null; targetId?: string | null }) => {
    const type = dep.type ?? "TASK";
    const targetId = dep.targetId ?? "";
    if (type === "ISSUE") {
      return dependencyIndex.issueById[targetId]?.status ?? null;
    }
    if (type === "PHASE") {
      return dependencyIndex.phaseById[targetId]?.status ?? null;
    }
    return dependencyIndex.taskById[targetId]?.status ?? null;
  };

  const dependencyHref = (dep: { type?: string | null; targetId?: string | null }) => {
    const type = dep.type ?? "TASK";
    const targetId = dep.targetId ?? "";
    if (type === "ISSUE") {
      return `/issues/${targetId}`;
    }
    if (type === "PHASE") {
      const issueId = dependencyIndex.issueForPhase[targetId];
      return issueId ? `/issues/${issueId}` : undefined;
    }
    const issueId = dependencyIndex.issueForTask[targetId];
    return issueId ? `/issues/${issueId}` : undefined;
  };

  const formatDependency = (dep: { type?: string | null; targetId?: string | null }) => {
    const type = dep.type ?? "TASK";
    const targetId = dep.targetId ?? "unknown";
    if (type === "ISSUE") {
      const issueDetail = dependencyIndex.issueById[targetId];
      if (!issueDetail) {
        return {
          label: targetId,
          tooltip: `Issue ${targetId}`,
          style: dependencyBadgeStyle(type, null),
        };
      }
      return {
        label: issueDetail.id,
        tooltip: (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              {issueDetail.title}
            </p>
            {issueDetail.deadline && (
              <div className="text-[11px] text-slate-600">
                — → {issueDetail.deadline}
              </div>
            )}
            {issueDetail.phases.length > 0 && (
              <IssueProgressBar
                progressSegments={buildIssuePhaseSegments(issueDetail, userLabel) ?? undefined}
                progressTotal={1}
              />
            )}
          </div>
        ),
        style: dependencyBadgeStyle(type, issueDetail.status),
      };
    }
    if (type === "PHASE") {
      const phase = dependencyIndex.phaseById[targetId];
      if (!phase) {
        return {
          label: `phase:${targetId}`,
          tooltip: `Phase ${targetId}`,
          style: dependencyBadgeStyle(type, null),
        };
      }
      const issueKey = dependencyIndex.issueForPhase[targetId] ?? "issue";
      return {
        label: `${issueKey}:${phaseLabel(phase)}`,
        tooltip: (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              {phaseLabel(phase)}
            </p>
            {phase.deadline && (
              <div className="text-[11px] text-slate-600">
                — → {phase.deadline}
              </div>
            )}
            {phase.tasks.length > 0 && (
              <IssueProgressBar
                progressSegments={buildTaskSegments(phase.tasks, false, undefined, {
                  phaseDeadline: phase.deadline ?? null,
                  issueDeadline:
                    dependencyIndex.issueById[dependencyIndex.issueForPhase[targetId] ?? ""]?.deadline ??
                    null,
                })}
                progressTotal={phase.tasks.length}
              />
            )}
          </div>
        ),
        style: dependencyBadgeStyle(type, phase.status),
      };
    }
    const task = dependencyIndex.taskById[targetId];
    if (!task) {
      return {
        label: `task:${targetId}`,
        tooltip: `Task ${targetId}`,
        style: dependencyBadgeStyle(type, null),
      };
    }
    const issueKey = dependencyIndex.issueForTask[targetId] ?? "issue";
    const phaseId = dependencyIndex.phaseForTask[targetId];
    const phase = phaseId ? dependencyIndex.phaseById[phaseId] : null;
    const phaseName = phase ? phaseLabel(phase) : "phase";
    const dueSuffix = task.dueDate ? ` · Due ${task.dueDate}` : "";
    return {
      label: `${issueKey}:${phaseName}:${task.title}`,
      tooltip: `${task.title} · ${statusLabel(task.status)}${dueSuffix}`,
      style: dependencyBadgeStyle("TASK", task.status),
    };
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
          const draftTask = getTaskDraft(phase.id);
          const draftDependencyStatus = worstStatus(
            draftTask.dependencies.map((dep) => dependencyStatus(dep)),
          );
          const draftDateWarning = !isOnOrBefore(
            draftTask.dueDate,
            phaseDeadlineLimit,
          )
            ? "Due date must be on or before the phase or issue deadline."
            : !isDateRangeValid(draftTask.startDate, draftTask.dueDate)
              ? "Due date must be after the start date."
              : null;
          return (
            <PhaseCard
              key={phase.id}
              phase={phase}
              issue={issue}
              statusError={statusError}
            >
              <PhaseHeader
                phase={phase}
                issue={issue}
                users={users}
                statusSaving={Boolean(phaseStatusSaving[phase.id])}
                deadlineOpen={openPhaseDeadlinePopover === phase.id}
                deadlineShift={phaseDeadlineShift}
                deadlineDraft={getPhaseDeadlineDraft(phase)}
                deadlineWarning={
                  !isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline)
                    ? "Phase deadline must be on or before the issue deadline."
                    : null
                }
                onToggleDeadline={() =>
                  setOpenPhaseDeadlinePopover((current) =>
                    current === phase.id ? null : phase.id,
                  )
                }
                onCloseDeadline={() => setOpenPhaseDeadlinePopover(null)}
                onDeadlineChange={(value) => updatePhaseDeadlineDraft(phase.id, value)}
                onSaveDeadline={async () => {
                  if (!isOnOrBefore(getPhaseDeadlineDraft(phase), issue.deadline)) {
                    return;
                  }
                  const nextDeadline = getPhaseDeadlineDraft(phase);
                  const clearDeadline = !nextDeadline;
                  const before = issue;
                  const { data, error: apiError } = await api.PATCH(
                    "/issues/{issueId}/phases/{phaseId}",
                    {
                      params: { path: { issueId, phaseId: phase.id } },
                      body: {
                        deadline: clearDeadline ? undefined : nextDeadline || undefined,
                        clearDeadline,
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
                onStatusChange={async (nextStatus) => {
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
                onRequestUsers={onRequestUsers}
                onSaveAssignee={async (nextId) => {
                  const { data, error: apiError } = await api.PATCH(
                    "/issues/{issueId}/phases/{phaseId}/assignee",
                    {
                      params: {
                        path: { issueId, phaseId: phase.id },
                      },
                      body: {
                        assigneeId: nextId ?? undefined,
                      },
                    },
                  );
                  if (apiError || !data) {
                    throw new Error("Unable to update assignee.");
                  }
                  onIssueUpdate(data as IssueDetail);
                }}
              />
              <PhaseProgress phase={phase} issueDeadline={issue.deadline ?? null} />
              {(() => {
                const draft = getCompletionDraft(phase);
                const finishPhase = async () => {
                  if (draft.saving) {
                    return;
                  }
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
                        completionArtifactUrl: draft.artifactUrl.trim() || undefined,
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
                };

                return (
                  <PhaseCompletionPanel
                    phase={phase}
                    draft={draft}
                    onDraftChange={(next) => updateCompletionDraft(phase.id, next)}
                    onFinish={finishPhase}
                    onCancel={() =>
                      updateCompletionDraft(phase.id, {
                        pendingStatus: null,
                        error: null,
                      })
                    }
                  />
                );
              })()}
              <div className="mt-3 space-y-0">
                {phase.tasks.map((task) => {
                  const taskMeta = getTaskMetaDraft(task);
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      issue={issue}
                      users={users}
                      taskMeta={taskMeta}
                      phaseDeadlineLimit={phaseDeadlineLimit}
                      openDatePopover={openTaskDatePopover === task.id}
                      datePopoverShift={taskDateShift}
                      openDependencyPopover={openTaskDependencyPopover === task.id}
                      dependencyState={getDependencyState(task.id)}
                      dependencyIssues={dependencyIssues}
                      onToggleDatePopover={() =>
                        setOpenTaskDatePopover((current) =>
                          current === task.id ? null : task.id,
                        )
                      }
                      onToggleDependencyPopover={() =>
                        setOpenTaskDependencyPopover((current) =>
                          current === task.id ? null : task.id,
                        )
                      }
                      onCancelDatePopover={() => setOpenTaskDatePopover(null)}
                      onUpdateTaskMeta={(next) => updateTaskMetaDraft(task, next)}
                      onSaveDates={async () => {
                        if (
                          !isDateRangeValid(taskMeta.startDate, taskMeta.dueDate) ||
                          !isOnOrBefore(taskMeta.dueDate, phaseDeadlineLimit)
                        ) {
                          return;
                        }
                        const clearStartDate = !taskMeta.startDate;
                        const clearDueDate = !taskMeta.dueDate;
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
                              startDate: taskMeta.startDate || null,
                              dueDate: taskMeta.dueDate || null,
                              clearStartDate,
                              clearDueDate,
                            },
                          },
                        );
                        if (!apiError && data) {
                          onIssueUpdate(data as IssueDetail);
                          setOpenTaskDatePopover(null);
                        }
                      }}
                      onClearDates={async () => {
                        updateTaskMetaDraft(task, { startDate: "", dueDate: "" });
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
                              startDate: null,
                              dueDate: null,
                              clearStartDate: true,
                              clearDueDate: true,
                            },
                          },
                        );
                        if (!apiError && data) {
                          onIssueUpdate(data as IssueDetail);
                        }
                      }}
                      onSaveAssignee={async (nextId) => {
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
                              assigneeId: nextId ?? undefined,
                            },
                          },
                        );
                        if (apiError || !data) {
                          throw new Error("Unable to update assignee.");
                        }
                        onIssueUpdate(data as IssueDetail);
                      }}
                      onChangeStatus={async (nextStatus) => {
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
                      onRemoveDependency={(depIndex) => {
                        const nextDeps = taskMeta.dependencies.filter(
                          (_, index) => index !== depIndex,
                        );
                        updateTaskMetaDraft(task, { dependencies: nextDeps });
                      }}
                      onSearchDependencies={(query) => void searchIssues(task.id, query)}
                      onAddDependency={(dep) => addDependencyForTask(task, dep)}
                      ensureIssueDetail={ensureIssueDetail}
                      setDependencyState={(updater) => setDependencyState(task.id, updater)}
                      dependencyBadgeStyle={dependencyBadgeStyle}
                      dependencyStatus={dependencyStatus}
                      dependencyHref={dependencyHref}
                      formatDependency={formatDependency}
                      taskStatusSaving={Boolean(taskStatusSaving[task.id])}
                      onCloseDependencies={() => setOpenTaskDependencyPopover(null)}
                      onSaveDependencies={async () => {
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
                              dependencies: uniqueDependencies(taskMeta.dependencies),
                            },
                          },
                        );
                        if (!apiError && data) {
                          onIssueUpdate(data as IssueDetail);
                          setOpenTaskDependencyPopover(null);
                        }
                      }}
                      onRequestUsers={onRequestUsers}
                    />
                  );
                })}
              </div>
              <TaskDraftPanel
                phaseId={phase.id}
                issue={issue}
                users={users}
                draft={draftTask}
                datePopoverOpen={openTaskDatePopover === `draft-${phase.id}`}
                datePopoverShift={taskDateShift}
                dependencyPopoverOpen={openTaskDependencyPopover === `draft-${phase.id}`}
                dependencyState={getDependencyState(`draft-${phase.id}`)}
                dependencyIssues={dependencyIssues}
                dateWarning={draftDateWarning}
                endMax={phaseDeadlineLimit}
                onTitleChange={(value) => updateTaskDraft(phase.id, { title: value })}
                onAssigneeChange={(nextId) =>
                  updateTaskDraft(phase.id, { assigneeId: nextId ?? "" })
                }
                onSubmit={() => void submitTaskDraft(phase)}
                onToggleDatePopover={() =>
                  setOpenTaskDatePopover((current) =>
                    current === `draft-${phase.id}` ? null : `draft-${phase.id}`,
                  )
                }
                onCloseDatePopover={() => setOpenTaskDatePopover(null)}
                onDateChange={(start, end) =>
                  updateTaskDraft(phase.id, { startDate: start, dueDate: end })
                }
                onClearDates={() =>
                  updateTaskDraft(phase.id, { startDate: "", dueDate: "" })
                }
                onToggleDependencyPopover={() =>
                  setOpenTaskDependencyPopover((current) =>
                    current === `draft-${phase.id}` ? null : `draft-${phase.id}`,
                  )
                }
                onSearchDependencies={(query) =>
                  void searchIssues(`draft-${phase.id}`, query)
                }
                onAddDependency={(dep) => addDependencyForDraft(phase.id, dep)}
                onRemoveDependency={(depIndex) => {
                  const nextDeps = draftTask.dependencies.filter(
                    (_, index) => index !== depIndex,
                  );
                  updateTaskDraft(phase.id, { dependencies: nextDeps });
                }}
                setDependencyState={(updater) =>
                  setDependencyState(`draft-${phase.id}`, updater)
                }
                ensureIssueDetail={ensureIssueDetail}
                dependencyButtonClass={dependencyBadgeStyle(
                  "TASK",
                  draftDependencyStatus,
                )}
                dependencyHref={dependencyHref}
                formatDependency={formatDependency}
                onRequestUsers={onRequestUsers}
              />
            </PhaseCard>
          );
        })}
    </div>
  );
}
