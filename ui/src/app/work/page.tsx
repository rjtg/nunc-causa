"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { useHealth } from "@/lib/health/context";

type WorkResponse = {
  ownedIssues: { id?: string; title?: string }[];
  assignedPhases: {
    issueId?: string;
    phaseId?: string;
    phaseName?: string;
    status?: string;
  }[];
  assignedTasks: {
    issueId?: string;
    phaseId?: string;
    taskId?: string;
    taskTitle?: string;
    status?: string;
  }[];
};

export default function WorkPage() {
  const api = useApi();
  const { token, username, ready } = useAuth();
  const { recoveries } = useHealth();
  const isAuthed = Boolean(token || username);
  const [work, setWork] = useState<WorkResponse | null>(null);
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
      const { data, error: apiError } = await api.GET("/me/work");
      if (!active) {
        return;
      }
      if (apiError || !data) {
        setError("Unable to load work queue.");
        setLoading(false);
        return;
      }
      setWork(data as WorkResponse);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [api, isAuthed, ready, recoveries]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          My Work
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Today’s queue
        </h1>
      </header>

      {!ready && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Loading session…
        </div>
      )}

      {ready && !isAuthed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Sign in to load your queue.
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading work…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {work && (
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              label: "Owned issues",
              items: work.ownedIssues.map((issue) => ({
                id: issue.id ?? "—",
                label: `${issue.id ?? "—"} ${issue.title ?? ""}`,
              })),
            },
            {
              label: "Assigned phases",
              items: work.assignedPhases.map((phase) => ({
                id: phase.issueId ?? "—",
                label: `${phase.issueId ?? "—"} ${phase.phaseName ?? ""} (${
                  phase.status ?? "—"
                })`,
              })),
            },
            {
              label: "Assigned tasks",
              items: work.assignedTasks.map((task) => ({
                id: task.issueId ?? "—",
                label: `${task.issueId ?? "—"} ${task.taskTitle ?? ""} (${
                  task.status ?? "—"
                })`,
              })),
            },
          ].map((lane) => (
            <div
              key={lane.label}
              className="rounded-2xl border border-slate-200/60 bg-white/90 p-4"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {lane.label}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {lane.items.length === 0 && (
                  <li className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-slate-500">
                    Nothing assigned.
                  </li>
                )}
                {lane.items.map((item) => (
                  <li
                    key={`${lane.label}-${item.label}`}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                  >
                    {item.id !== "—" ? (
                      <Link className="hover:underline" href={`/issues/${item.id}`}>
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
