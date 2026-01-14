"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

type Phase = {
  id: string;
  name: string;
  status: string;
  assigneeId: string;
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

type HistoryResponse = {
  activity?: ActivityEntry[];
  audit?: ActivityEntry[];
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
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
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
        setComments(commentResponse.data as CommentEntry[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [api, issueId, isAuthed, ready]);

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
            {issue.phases.map((phase) => (
              <div
                key={phase.id}
                className="rounded-2xl border border-slate-200/60 bg-white/90 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{phase.status}</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {phase.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Assignee: {phase.assigneeId}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {phase.tasks.length} tasks
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {phase.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <span>{task.title}</span>
                      <span className="text-xs text-slate-500">
                        {task.status}
                      </span>
                    </div>
                  ))}
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
              setComments((prev) => [data as CommentEntry, ...prev]);
              setCommentBody("");
            }}
          >
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
            />
            <div className="flex items-center gap-3">
              <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                Post comment
              </button>
              {commentError && (
                <span className="text-xs text-rose-600">{commentError}</span>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {comments.length === 0 && (
              <p className="text-sm text-slate-500">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{comment.authorId}</span>
                  <span>{formatTimestamp(comment.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
              </div>
            ))}
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
