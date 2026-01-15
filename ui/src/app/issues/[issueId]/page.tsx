"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

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
const taskStatuses = ["NOT_STARTED", "IN_PROGRESS", "DONE"];

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
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [readSaving, setReadSaving] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
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
          { id: "overview", label: "Overview" },
          { id: "activity", label: `Activity (${historyCount})` },
          { id: "comments", label: `Comments (${comments.length})` },
        ].map((item) => (
          <button
            key={item.id}
            className={`rounded-full px-4 py-2 ${
              tab === item.id
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white"
            }`}
            type="button"
            onClick={() =>
              setTab(item.id as "overview" | "activity" | "comments")
            }
          >
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
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
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
                          {getCompletionDraft(phase).saving
                            ? "Finishing…"
                            : "Finish phase"}
                        </button>
                        <button
                          className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700"
                          type="button"
                          onClick={() =>
                            updateCompletionDraft(phase.id, {
                              pendingStatus: null,
                              error: null,
                            })
                          }
                        >
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
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <span>{task.title}</span>
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
                  ))}
                  {statusError && (
                    <p className="text-xs text-rose-600">{statusError}</p>
                  )}
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Add task
                    </p>
                    <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,180px)_auto]">
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        placeholder="Task title"
                        value={getTaskDraft(phase.id).title}
                        onChange={(event) =>
                          updateTaskDraft(phase.id, { title: event.target.value })
                        }
                      />
                      <div className="relative">
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
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
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
                            saving: false,
                            error: null,
                          });
                        }}
                      >
                        {getTaskDraft(phase.id).saving ? "Adding…" : "Add"}
                      </button>
                    </div>
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
          <div className="space-y-3">
            {comments.length === 0 && (
              <p className="text-sm text-slate-500">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{comment.authorId}</span>
                  <span>{formatTimestamp(comment.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg">
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
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Add a comment…"
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                  Post comment
                </button>
                {commentError && (
                  <span className="text-xs text-rose-600">{commentError}</span>
                )}
                {commentThread.unreadCount > 0 && commentThread.firstUnreadCommentId && (
                  <button
                    className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700"
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
                    Jump to unread ({commentThread.unreadCount})
                  </button>
                )}
                {showJumpToLatest && (
                  <button
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                    type="button"
                    onClick={() =>
                      commentsEndRef.current?.scrollIntoView({
                        behavior: "smooth",
                      })
                    }
                  >
                    Jump to latest
                  </button>
                )}
              </div>
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
  return date.toISOString().replace("T", " ").replace("Z", " UTC");
}
