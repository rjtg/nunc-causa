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
  ownerId: string;
  projectId?: string | null;
  status: string;
  phases: Phase[];
  allowedActions?: Record<string, { allowed: boolean; reason?: string }>;
};

export default function IssueDetailPage() {
  const params = useParams();
  const issueId = params.issueId as string;
  const api = useApi();
  const { token } = useAuth();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await api.GET("/issues/{issueId}", {
        params: { path: { issueId } },
      });
      const history = await api.GET("/issues/{issueId}/history", {
        params: { path: { issueId } },
      });
      if (!active) {
        return;
      }
      if (apiError || !data) {
        setError("Unable to load issue.");
        setLoading(false);
        return;
      }
      setIssue(data as IssueDetail);
      if (history.data?.activity) {
        setHistoryCount(history.data.activity.length);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [api, issueId, token]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Connect your API token to view this issue.
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
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
          <span>Owner: {issue.ownerId}</span>
          <span>Status: {issue.status}</span>
          <span>Project: {issue.projectId ?? "—"}</span>
          <span>Activity entries: {historyCount}</span>
        </div>
      </header>

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
                <div key={key} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                  <p className="font-semibold text-slate-800">{key}</p>
                  <p>{action.allowed ? "Allowed" : action.reason ?? "Blocked"}</p>
                </div>
              ))}
            {!issue.allowedActions && (
              <p className="text-slate-500">No actions available.</p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
