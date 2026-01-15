"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { Icon } from "@/components/icons";

type Phase = {
  id: string;
  name: string;
  status: string;
  assigneeId: string;
  kind?: string | null;
  completionComment?: string | null;
  completionArtifactUrl?: string | null;
  tasks: Task[];
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

type Task = {
  id: string;
  title: string;
  status: string;
  assigneeId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  dependencies?: { type?: string | null; targetId?: string | null }[] | null;
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

type IssueDetail = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  projectId?: string | null;
  status: string;
  phases: Phase[];
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

type ActivityEntry = {
  id: string;
  type: string;
  summary: string;
  actorId?: string | null;
  occurredAt: string;
};

type CommentEntry = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  readByCount?: number | null;
  unreadByCount?: number | null;
  readByUsers?: { id?: string | null; displayName?: string | null }[] | null;
  unreadByUsers?: { id?: string | null; displayName?: string | null }[] | null;
};

type CommentThread = {
  comments: CommentEntry[];
  unreadCount: number;
  lastReadAt?: string | null;
  latestCommentAt?: string | null;
  firstUnreadCommentId?: string | null;
};

type HistoryResponse = {
  activity?: ActivityEntry[];
  audit?: ActivityEntry[];
};

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

type UserOption = {
  id: string;
  displayName: string;
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

export default function IssueDetailPage() {
  const params = useParams();
  const issueId = params.issueId as string;
  const api = useApi();
  const { token, username, ready } = useAuth();
  const isAuthed = Boolean(token || username);
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [commentThread, setCommentThread] = useState<CommentThread>({
    comments: [],
    unreadCount: 0,
    lastReadAt: null,
    latestCommentAt: null,
    firstUnreadCommentId: null,
  });
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [readSaving, setReadSaving] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
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
  const [tab, setTab] = useState<"overview" | "activity" | "comments">(
    "overview",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const [issueResponse, historyResponse, commentResponse] =
        await Promise.all([
          api.GET("/issues/{issueId}", { params: { path: { issueId } } }),
          api.GET("/issues/{issueId}/history", { params: { path: { issueId } } }),
          api.GET("/issues/{issueId}/comments", { params: { path: { issueId } } }),
        ]);
      if (!active) {
        return;
      }
      if (issueResponse.error || !issueResponse.data) {
        setError("Unable to load issue.");
        setLoading(false);
        return;
      }
      setIssue(issueResponse.data as IssueDetail);
      if (historyResponse.data?.activity) {
        setHistoryCount(historyResponse.data.activity.length);
        setHistory(historyResponse.data as HistoryResponse);
      }
      if (commentResponse.data) {
        const data = commentResponse.data as CommentThread;
        setCommentThread({
          comments: data.comments ?? [],
          unreadCount: data.unreadCount ?? 0,
          lastReadAt: data.lastReadAt ?? null,
          latestCommentAt: data.latestCommentAt ?? null,
          firstUnreadCommentId: data.firstUnreadCommentId ?? null,
        });
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [api, issueId, isAuthed, ready]);

  useEffect(() => {
    if (!ready || !isAuthed || !issue) {
      return;
    }
    let active = true;
    async function loadUsers() {
      const { data, error: apiError } = await api.GET("/users", {
        params: {
          query: issue.projectId ? { projectId: issue.projectId } : {},
        },
      });
      if (!active) {
        return;
      }
      if (apiError) {
        setUsers([]);
        return;
      }
      setUsers(
        (data ?? []).map((user) => ({
          id: user.id ?? "unknown",
          displayName: user.displayName ?? "Unknown",
        })),
      );
    }
    loadUsers();
    return () => {
      active = false;
    };
  }, [api, isAuthed, issue, ready]);

  const comments = commentThread.comments;

  const markCommentsRead = useCallback(async (lastReadCommentId?: string) => {
    if (readSaving) {
      return;
    }
    setReadSaving(true);
    const { data, error: apiError } = await api.POST(
      "/issues/{issueId}/comments/read",
      {
        params: { path: { issueId } },
        body: lastReadCommentId ? { lastReadCommentId } : {},
      },
    );
    if (!apiError && data) {
      const response = data as {
        lastReadAt?: string | null;
        unreadCount?: number | null;
        latestCommentAt?: string | null;
      };
      setCommentThread((prev) => ({
        ...prev,
        unreadCount: response.unreadCount ?? 0,
        lastReadAt: response.lastReadAt ?? prev.lastReadAt,
        latestCommentAt: response.latestCommentAt ?? prev.latestCommentAt,
        firstUnreadCommentId: null,
      }));
    }
    setReadSaving(false);
  }, [api, issueId, readSaving]);

  useEffect(() => {
    if (tab !== "comments") {
      return;
    }
    const target = commentsEndRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowJumpToLatest(!entry.isIntersecting);
        if (entry.isIntersecting && commentThread.unreadCount > 0) {
          const latestId = comments[comments.length - 1]?.id;
          if (latestId) {
            markCommentsRead(latestId);
          }
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [comments, commentThread.unreadCount, markCommentsRead, tab]);

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

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Sign in to view this issue.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading issue…</p>;
  }

  if (error || !issue) {
    return <p className="text-sm text-rose-600">{error ?? "Not found."}</p>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200/60 bg-white/90 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Issue {issue.id}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {issue.title}
        </h1>
        <p className="mt-3 text-sm text-slate-600">{issue.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
          <span>Owner: {issue.ownerId}</span>
          <span>Status: {issue.status}</span>
          <span>Project: {issue.projectId ?? "—"}</span>
          <span>Activity entries: {historyCount}</span>
        </div>
      </header>

      <div className="flex gap-2 text-xs font-semibold text-slate-600">
        {[
          { id: "overview", label: "Overview", icon: "comment" as const },
          { id: "activity", label: `Activity (${historyCount})`, icon: "reset" as const },
          { id: "comments", label: `Comments (${comments.length})`, icon: "comment" as const },
        ].map((item) => (
          <button
            key={item.id}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
              tab === item.id
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white"
            }`}
            type="button"
            onClick={() =>
              setTab(item.id as "overview" | "activity" | "comments")
            }
          >
            <Icon name={item.icon} size={12} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
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
              .map((phase) => (
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
                          setIssue(data as IssueDetail);
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
                            progress.total > 0
                              ? (count / progress.total) * 100
                              : 0;
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
                {getCompletionDraft(phase).pendingStatus === "DONE" && phase.status !== "DONE" && (
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
                            setIssue(data as IssueDetail);
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
                          {getCompletionDraft(phase).saving
                            ? "Finishing…"
                            : "Finish phase"}
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
                            setIssue(data as IssueDetail);
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
                              value={getTaskMetaDraft(task).dueDate}
                              onChange={(event) =>
                                updateTaskMetaDraft(task, {
                                  dueDate: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
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
                                    startDate: draft.startDate || undefined,
                                    dueDate: draft.dueDate || undefined,
                                  },
                                },
                              );
                              if (!apiError && data) {
                                setIssue(data as IssueDetail);
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
                                setIssue(data as IssueDetail);
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
                          list="task-assignee-options"
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
                          setIssue(data as IssueDetail);
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
                              value={getTaskDraft(phase.id).dueDate}
                              onChange={(event) =>
                                updateTaskDraft(phase.id, {
                                  dueDate: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
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
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Allowed actions
            </h2>
            <div className="space-y-2 text-xs text-slate-600">
              {issue.allowedActions &&
                Object.entries(issue.allowedActions).map(([key, action]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                  >
                    <p className="font-semibold text-slate-800">{key}</p>
                    <p>
                      {action.allowed ? "Allowed" : action.reason ?? "Blocked"}
                    </p>
                  </div>
                ))}
              {!issue.allowedActions && (
                <p className="text-slate-500">No actions available.</p>
              )}
            </div>
          </aside>
        </section>
      )}

      <datalist id="task-assignee-options">
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.displayName}
          </option>
        ))}
      </datalist>

      {tab === "activity" && (
        <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
          {history?.activity?.length ? (
            history.activity.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{entry.type}</span>
                  <span>{formatTimestamp(entry.occurredAt)}</span>
                </div>
                <p className="mt-2 font-semibold">{entry.summary}</p>
                {entry.actorId && (
                  <p className="text-xs text-slate-500">
                    Actor: {entry.actorId}
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No activity yet.</p>
          )}
        </section>
      )}

      {tab === "comments" && (
        <section className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
          <div className="space-y-3 pb-32">
            {comments.length === 0 && (
              <p className="text-sm text-slate-500">No comments yet.</p>
            )}
            {comments.map((comment) => {
              const readByCount = comment.readByCount ?? 0;
              const unreadByCount = comment.unreadByCount ?? 0;
              const totalTargets = readByCount + unreadByCount;
              const allRead = totalTargets > 0 && unreadByCount === 0;
              const someRead = readByCount > 0 && !allRead;
              return (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{comment.authorId}</span>
                  <span className="flex items-center gap-2">
                    {totalTargets > 0 && (
                      <button
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          allRead
                            ? "bg-sky-100 text-sky-700"
                            : someRead
                              ? "bg-slate-100 text-slate-600"
                              : "bg-transparent text-slate-400"
                        }`}
                        type="button"
                        title={`${readByCount} read · ${unreadByCount} unread`}
                        onClick={() =>
                          setOpenReceiptId((current) =>
                            current === comment.id ? null : comment.id,
                          )
                        }
                      >
                        <Icon name="check" size={12} />
                        {readByCount}/{totalTargets}
                      </button>
                    )}
                    <span>{formatTimestamp(comment.createdAt)}</span>
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
                {openReceiptId === comment.id && totalTargets > 0 && (
                  <div className="mt-3 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-700">
                        Read ({readByCount})
                      </p>
                      <ul className="mt-1 space-y-1">
                        {(comment.readByUsers ?? []).map((user) => (
                          <li key={user.id ?? "unknown"}>
                            {user.displayName ?? user.id ?? "Unknown"}
                          </li>
                        ))}
                        {readByCount === 0 && (
                          <li className="text-slate-400">None yet.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">
                        Unread ({unreadByCount})
                      </p>
                      <ul className="mt-1 space-y-1">
                        {(comment.unreadByUsers ?? []).map((user) => (
                          <li key={user.id ?? "unknown"}>
                            {user.displayName ?? user.id ?? "Unknown"}
                          </li>
                        ))}
                        {unreadByCount === 0 && (
                          <li className="text-slate-400">All caught up.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
            })}
            <div ref={commentsEndRef} />
          </div>

          <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg">
            {commentThread.unreadCount > 0 &&
              commentThread.firstUnreadCommentId && (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span>{commentThread.unreadCount} unread comments</span>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-700"
                    type="button"
                    onClick={() => {
                      const target = document.getElementById(
                        `comment-${commentThread.firstUnreadCommentId}`,
                      );
                      if (target) {
                        target.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    <Icon name="comment" size={12} />
                    Jump to unread
                  </button>
                </div>
              )}
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!commentBody.trim()) {
                  return;
                }
                setCommentError(null);
                const { data, error: apiError } = await api.POST(
                  "/issues/{issueId}/comments",
                  {
                    params: { path: { issueId } },
                    body: { body: commentBody, mentions: [] },
                  },
                );
                if (apiError || !data) {
                  setCommentError("Unable to add comment.");
                  return;
                }
                const nextComment = data as CommentEntry;
                setCommentThread((prev) => ({
                  ...prev,
                  comments: [...prev.comments, nextComment],
                  latestCommentAt: nextComment.createdAt,
                }));
                setCommentBody("");
                setTimeout(() => {
                  commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 0);
                markCommentsRead(nextComment.id);
              }}
            >
              <div className="relative">
                <textarea
                  className="max-h-40 min-h-[40px] w-full resize-none rounded-xl border border-slate-200 px-4 py-2 pr-12 text-sm"
                  placeholder="Add a comment…"
                  rows={1}
                  value={commentBody}
                  onChange={(event) => {
                    setCommentBody(event.target.value);
                    event.currentTarget.style.height = "auto";
                    event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && event.ctrlKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="submit"
                  disabled={!commentBody.trim()}
                  aria-label="Send comment"
                  title="Send comment"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon name="send" size={12} />
                    Send
                  </span>
                </button>
              </div>
              {showJumpToLatest && (
                <div className="flex justify-center">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-md"
                    type="button"
                    onClick={() =>
                      commentsEndRef.current?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                  >
                    <Icon name="arrow-down" size={12} />
                    Jump to latest
                  </button>
                </div>
              )}
              {commentError && (
                <div className="flex justify-center">
                  <span className="text-xs text-rose-600">{commentError}</span>
                </div>
              )}
            </form>
          </div>
        </section>
      )}
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
