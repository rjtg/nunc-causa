"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";
import { UserBadgeSelect } from "@/components/user-badge-select";
import { useHealth } from "@/lib/health/context";
import type {
  CommentEntry,
  CommentThread,
  HistoryResponse,
  IssueDetail,
  UserOption,
} from "./types";
import { buildIssuePhaseSegments } from "./progress";
import { PhaseBoard } from "./components/PhaseBoard";
import { IssueProgressBar } from "@/components/issue-progress-bar";
import { DatePicker } from "@/components/date-picker";
import { IssueActivity } from "./components/IssueActivity";
import { IssueComments } from "./components/IssueComments";
import {
  issueOverdueClass,
  issueStatusBadgeStyle,
  issueStatusLabel,
  userLabel,
} from "../issue-list-utils";

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
  const [issueDeadlineShift, setIssueDeadlineShift] = useState(0);
  const [issueTitleDraft, setIssueTitleDraft] = useState("");
  const [issueDescriptionDraft, setIssueDescriptionDraft] = useState("");
  const [issueEditDirty, setIssueEditDirty] = useState(false);
  const [issueEditSaving, setIssueEditSaving] = useState(false);
  const [issueEditError, setIssueEditError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
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

  const progressSegments = useMemo(() => {
    if (!issue) {
      return null;
    }
    return buildIssuePhaseSegments(
      issue,
      (userId) => userLabel(users, userId),
      (phaseId) => {
        const target = document.getElementById(`phase-${phaseId}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    );
  }, [issue, users]);

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
      const nextIssue = issueResponse.data as IssueDetail;
      setIssue(nextIssue);
      if (!issueEditDirty) {
        setIssueTitleDraft(nextIssue.title ?? "");
        setIssueDescriptionDraft(nextIssue.description ?? "");
      }
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
    if (!issueDeadlineOpen) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-issue-deadline-popover]")) {
        return;
      }
      setIssueDeadlineOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [issueDeadlineOpen]);

  useLayoutEffect(() => {
    if (!issueDeadlineOpen) {
      setIssueDeadlineShift(0);
      return;
    }
    const element = document.querySelector(
      "[data-issue-deadline-popover-content]",
    ) as HTMLElement | null;
    if (!element) {
      setIssueDeadlineShift(0);
      return;
    }
    const rect = element.getBoundingClientRect();
    const padding = 12;
    let shift = 0;
    if (rect.left < padding) {
      shift = padding - rect.left;
    } else if (rect.right > window.innerWidth - padding) {
      shift = window.innerWidth - padding - rect.right;
    }
    setIssueDeadlineShift(shift);
  }, [issueDeadlineOpen]);

  const loadUsers = useCallback(async () => {
    if (!ready || !isAuthed || !issue) {
      return;
    }
    const { data, error: apiError } = await api.GET("/users", {
      params: {
        query: issue.projectId ? { projectId: issue.projectId } : {},
      },
    });
    if (apiError) {
      setUsers([]);
      return;
    }
    setUsers(
      (data ?? []).map((user) => ({
        id: user.id ?? "unknown",
        displayName: user.displayName ?? "Unknown",
        openIssueCount: user.openIssueCount ?? 0,
        openPhaseCount: user.openPhaseCount ?? 0,
        openTaskCount: user.openTaskCount ?? 0,
      })),
    );
  }, [api, isAuthed, issue, ready]);

  useEffect(() => {
    let active = true;
    if (!ready || !isAuthed || !issue) {
      return () => {
        active = false;
      };
    }
    void (async () => {
      if (!active) {
        return;
      }
      await loadUsers();
    })();
    return () => {
      active = false;
    };
  }, [isAuthed, issue, loadUsers, ready, recoveries]);

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

  const toggleReceipt = useCallback((commentId: string) => {
    setOpenReceiptId((current) => (current === commentId ? null : commentId));
  }, []);

  const jumpToUnread = useCallback(() => {
    if (!commentThread.firstUnreadCommentId) {
      return;
    }
    const target = document.getElementById(
      `comment-${commentThread.firstUnreadCommentId}`,
    );
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, [commentThread.firstUnreadCommentId]);

  const jumpToLatest = useCallback(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const submitComment = useCallback(async () => {
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
  }, [api, commentBody, issueId, markCommentsRead]);

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

  const hasIssueEdits =
    issueTitleDraft.trim() !== (issue.title ?? "") ||
    issueDescriptionDraft.trim() !== (issue.description ?? "");

  const saveIssueEdits = async () => {
    setIssueEditSaving(true);
    setIssueEditError(null);
    const { data, error: apiError } = await api.PATCH(
      "/issues/{issueId}",
      {
        params: { path: { issueId } },
        body: {
          title: issueTitleDraft.trim(),
          description: issueDescriptionDraft.trim(),
        },
      },
    );
    if (apiError || !data) {
      setIssueEditError("Unable to update issue.");
      setIssueEditSaving(false);
      return;
    }
    setIssue(data as IssueDetail);
    setIssueEditDirty(false);
    setEditingTitle(false);
    setEditingDescription(false);
    setIssueEditSaving(false);
  };

  const runCloseIssue = async () => {
    setStatusSaving(true);
    setStatusError(null);
    const { data, error: apiError } = await api.POST("/issues/{issueId}/actions/close", {
      params: { path: { issueId } },
    });
    if (apiError || !data) {
      setStatusError(
        issue?.allowedActions?.CLOSE_ISSUE?.reason ?? "Unable to close issue.",
      );
      setStatusSaving(false);
      return;
    }
    setIssue(data as IssueDetail);
    setStatusSaving(false);
  };

  const runAbandonIssue = async () => {
    setStatusSaving(true);
    setStatusError(null);
    const { data, error: apiError } = await api.POST("/issues/{issueId}/actions/abandon", {
      params: { path: { issueId } },
    });
    if (apiError || !data) {
      setStatusError(
        issue?.allowedActions?.ABANDON_ISSUE?.reason ?? "Unable to abandon issue.",
      );
      setStatusSaving(false);
      return;
    }
    setIssue(data as IssueDetail);
    setStatusSaving(false);
  };

  return (
    <div className="space-y-6">
      <header
        className={`rounded-2xl border border-slate-200/60 bg-white/90 p-6 ${issueOverdueClass(
          issue.status,
          issue.deadline,
        )}`}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Issue {issue.id}
        </p>
        <div className="mt-2 space-y-3">
          <div className="flex items-start justify-between gap-3">
            {editingTitle ? (
              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Title
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pr-24 text-sm text-slate-700"
                    value={issueTitleDraft}
                    onChange={(event) => {
                      setIssueTitleDraft(event.target.value);
                      setIssueEditDirty(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && event.ctrlKey) {
                        event.preventDefault();
                        if (hasIssueEdits && !issueEditSaving) {
                          void saveIssueEdits();
                        }
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                    <button
                      className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="button"
                      disabled={!hasIssueEdits || issueEditSaving}
                      onClick={saveIssueEdits}
                    >
                      <Icon name="check" size={12} />
                    </button>
                    <button
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                      type="button"
                      onClick={() => {
                        setIssueTitleDraft(issue.title ?? "");
                        setIssueEditDirty(false);
                        setEditingTitle(false);
                      }}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-slate-900">
                    {issue.title}
                  </h1>
                  <Tooltip content="Edit title">
                    <button
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      type="button"
                      onClick={() => {
                        setIssueTitleDraft(issue.title ?? "");
                        setEditingTitle(true);
                      }}
                    >
                      <Icon name="edit" size={14} />
                    </button>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <UserBadgeSelect
                    value={issue.ownerId}
                    users={users}
                    label="Owner"
                    ariaLabel="Change owner"
                    onRequestUsers={loadUsers}
                    onSave={async (nextId) => {
                      const { data, error: apiError } = await api.PATCH(
                        "/issues/{issueId}",
                        {
                          params: { path: { issueId } },
                          body: {
                            ownerId: nextId ?? undefined,
                          },
                        },
                      );
                      if (apiError || !data) {
                        throw new Error("Unable to update owner.");
                      }
                      setIssue(data as IssueDetail);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${issueStatusBadgeStyle(
                        issue.status,
                      )}`}
                    >
                      {issueStatusLabel(issue.status)}
                    </span>
                  </div>
                  <div className="relative" data-issue-deadline-popover>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                      type="button"
                      onClick={() => setIssueDeadlineOpen((open) => !open)}
                    >
                      <Icon name="calendar" size={12} />
                      Deadline: {issue.deadline ?? "—"}
                    </button>
                    {issueDeadlineOpen && (
                      <div
                        className="absolute left-1/2 top-full z-20 mt-2 inline-block w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-lg"
                        data-issue-deadline-popover-content
                        style={{
                          transform: `translateX(calc(-50% + ${issueDeadlineShift}px))`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Issue deadline
                          </p>
                          <button
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                            type="button"
                            onClick={() => setIssueDeadlineOpen(false)}
                          >
                            <Icon name="x" size={12} />
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-3">
                          <DatePicker
                            value={issueDeadlineDirty ? issueDeadlineDraft : issue.deadline ?? ""}
                            onChange={(value) => {
                              setIssueDeadlineDirty(true);
                              setIssueDeadlineDraft(value);
                            }}
                            onCancel={() => setIssueDeadlineOpen(false)}
                            onClear={() => {
                              setIssueDeadlineDirty(true);
                              setIssueDeadlineDraft("");
                            }}
                            onSave={async () => {
                              const before = issue;
                              const nextDeadline = issueDeadlineDirty
                                ? issueDeadlineDraft
                                : issue.deadline ?? "";
                              const clearDeadline = issueDeadlineDirty && !nextDeadline;
                              const { data, error: apiError } = await api.PATCH(
                                "/issues/{issueId}",
                                {
                                  params: { path: { issueId } },
                                  body: {
                                    deadline: clearDeadline ? undefined : nextDeadline || undefined,
                                    clearDeadline,
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
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            {editingDescription ? (
              <div className="flex-1 space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Description
                </label>
                <div className="relative">
                  <textarea
                    className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pr-24 text-sm text-slate-700"
                    value={issueDescriptionDraft}
                    onChange={(event) => {
                      setIssueDescriptionDraft(event.target.value);
                      setIssueEditDirty(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && event.ctrlKey) {
                        event.preventDefault();
                        if (hasIssueEdits && !issueEditSaving) {
                          void saveIssueEdits();
                        }
                      }
                    }}
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-2">
                    <button
                      className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      type="button"
                      disabled={!hasIssueEdits || issueEditSaving}
                      onClick={saveIssueEdits}
                    >
                      <Icon name="check" size={12} />
                    </button>
                    <button
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                      type="button"
                      onClick={() => {
                        setIssueDescriptionDraft(issue.description ?? "");
                        setIssueEditDirty(false);
                        setEditingDescription(false);
                      }}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-sm text-slate-600">{issue.description}</p>
              </div>
            )}
            {!editingDescription && (
              <Tooltip content="Edit description">
                <button
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  type="button"
                  onClick={() => {
                    setIssueDescriptionDraft(issue.description ?? "");
                    setEditingDescription(true);
                  }}
                >
                  <Icon name="edit" size={14} />
                </button>
              </Tooltip>
            )}
          </div>
          {issueEditError && (
            <p className="text-xs text-rose-600">{issueEditError}</p>
          )}
        </div>
        {progressSegments && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
            <div className="w-full">
              <IssueProgressBar progressSegments={progressSegments} progressTotal={1} />
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "overview", label: "Overview", icon: "comment" as const },
            {
              id: "activity",
              label: `Activity (${historyCount})`,
              icon: "reset" as const,
            },
            {
              id: "comments",
              label: `Comments (${comments.length})`,
              icon: "comment" as const,
            },
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
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip
            content={
              issue.allowedActions?.CLOSE_ISSUE?.allowed
                ? "Close issue"
                : issue.allowedActions?.CLOSE_ISSUE?.reason ?? "Not allowed"
            }
          >
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              type="button"
              disabled={
                !issue.allowedActions?.CLOSE_ISSUE?.allowed ||
                issue.status === "DONE" ||
                statusSaving
              }
              onClick={runCloseIssue}
            >
              <Icon name="check" size={12} />
              Close issue
            </button>
          </Tooltip>
          <Tooltip
            content={
              issue.allowedActions?.ABANDON_ISSUE?.allowed
                ? "Abandon issue"
                : issue.allowedActions?.ABANDON_ISSUE?.reason ?? "Not allowed"
            }
          >
            <button
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:bg-rose-50/50 disabled:text-rose-300"
              type="button"
              disabled={
                !issue.allowedActions?.ABANDON_ISSUE?.allowed || statusSaving
              }
              onClick={runAbandonIssue}
            >
              <Icon name="x" size={12} />
              Abandon issue
            </button>
          </Tooltip>
          {statusError && <span className="text-rose-600">{statusError}</span>}
        </div>
      </div>

      {tab === "overview" && (
        <section>
          <PhaseBoard
            issueId={issueId}
            issue={issue}
            api={api}
            users={users}
            onIssueUpdate={setIssue}
            onDeadlineImpact={(before, after) =>
              setDeadlineWarning(summarizeDeadlineImpact(before, after))
            }
            onRequestUsers={loadUsers}
          />
        </section>
      )}

      {tab === "activity" && (
        <IssueActivity history={history} />
      )}

      {tab === "comments" && (
        <IssueComments
          comments={comments}
          commentThread={commentThread}
          openReceiptId={openReceiptId}
          onToggleReceipt={toggleReceipt}
          commentBody={commentBody}
          onCommentBodyChange={setCommentBody}
          onSubmit={submitComment}
          commentError={commentError}
          showJumpToLatest={showJumpToLatest}
          onJumpToLatest={jumpToLatest}
          onJumpToUnread={jumpToUnread}
          commentsEndRef={commentsEndRef}
        />
      )}
    </div>
  );
}
