"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { Icon } from "@/components/icons";
import { useHealth } from "@/lib/health/context";
import type { CommentThread, HistoryResponse, IssueDetail, UserOption } from "./types";
import { PhaseBoard } from "./components/PhaseBoard";

export default function IssueDetailPage() {
  const params = useParams();
  const issueId = params.issueId as string;
  const api = useApi();
  const { token, username, ready } = useAuth();
  const { recoveries } = useHealth();
  const isAuthed = Boolean(token || username);
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [issueDeadlineDraft, setIssueDeadlineDraft] = useState("");
  const [issueDeadlineDirty, setIssueDeadlineDirty] = useState(false);
  const [issueDeadlineOpen, setIssueDeadlineOpen] = useState(false);
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
  const [deadlineWarning, setDeadlineWarning] = useState<string | null>(null);
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
  }, [api, issueId, isAuthed, ready, recoveries]);

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
  }, [api, isAuthed, issue, ready, recoveries]);

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

  const summarizeDeadlineImpact = (
    before: IssueDetail,
    after: IssueDetail,
  ) => {
    const mapDates = (source: IssueDetail) => {
      const entries = new Map<
        string,
        { dueDate?: string | null; startDate?: string | null }
      >();
      source.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          entries.set(task.id, {
            dueDate: task.dueDate ?? null,
            startDate: task.startDate ?? null,
          });
        });
      });
      return entries;
    };
    const beforeMap = mapDates(before);
    const dueChanges: string[] = [];
    const startChanges: string[] = [];
    after.phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        const prior = beforeMap.get(task.id);
        if (!prior) {
          return;
        }
        if ((prior.dueDate ?? "") !== (task.dueDate ?? "")) {
          dueChanges.push(task.id);
        }
        if ((prior.startDate ?? "") !== (task.startDate ?? "")) {
          startChanges.push(task.id);
        }
      });
    });
    if (dueChanges.length === 0 && startChanges.length === 0) {
      return null;
    }
    const parts = [];
    if (dueChanges.length > 0) {
      parts.push(`${dueChanges.length} task due dates shortened`);
    }
    if (startChanges.length > 0) {
      parts.push(`${startChanges.length} task start dates adjusted`);
    }
    return parts.join(". ");
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
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
            type="button"
            onClick={() => setIssueDeadlineOpen((open) => !open)}
          >
            <Icon name="calendar" size={12} />
            Deadline: {issue.deadline ?? "—"}
          </button>
        </div>
        {issueDeadlineOpen && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Issue deadline
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <label className="text-[11px] text-slate-500">
                Deadline
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  type="date"
                  value={issueDeadlineDirty ? issueDeadlineDraft : issue.deadline ?? ""}
                  onChange={(event) => {
                    setIssueDeadlineDirty(true);
                    setIssueDeadlineDraft(event.target.value);
                  }}
                />
              </label>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                type="button"
                onClick={async () => {
                  const before = issue;
                  const nextDeadline = issueDeadlineDirty
                    ? issueDeadlineDraft
                    : issue.deadline ?? "";
                  const { data, error: apiError } = await api.PATCH(
                    "/issues/{issueId}",
                    {
                      params: { path: { issueId } },
                      body: {
                        deadline: nextDeadline || undefined,
                      },
                    },
                  );
                  if (!apiError && data) {
                    const nextIssue = data as IssueDetail;
                    setIssue(nextIssue);
                    const warning = summarizeDeadlineImpact(before, nextIssue);
                    setDeadlineWarning(warning);
                    setIssueDeadlineDirty(false);
                    setIssueDeadlineOpen(false);
                  }
                }}
              >
                <Icon name="check" size={12} />
                Save
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                type="button"
                onClick={() => setIssueDeadlineOpen(false)}
              >
                <Icon name="x" size={12} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </header>
      {deadlineWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <p className="font-semibold">Deadline update adjusted tasks.</p>
          <p className="mt-1">{deadlineWarning}</p>
        </div>
      )}

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
          <PhaseBoard
            issueId={issueId}
            issue={issue}
            api={api}
            users={users}
            onIssueUpdate={setIssue}
            onDeadlineImpact={(before, after) =>
              setDeadlineWarning(summarizeDeadlineImpact(before, after))
            }
          />
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
