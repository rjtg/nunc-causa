"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import { useHealth } from "@/lib/health/context";
import { Icon } from "@/components/icons";

type PhaseDraft = {
  enabled: boolean;
  assigneeId: string;
  kind: string;
  deadline: string;
};

const defaultPhases: PhaseDraft[] = [
  { enabled: true, assigneeId: "", kind: "INVESTIGATION", deadline: "" },
  { enabled: true, assigneeId: "", kind: "PROPOSE_SOLUTION", deadline: "" },
  { enabled: true, assigneeId: "", kind: "DEVELOPMENT", deadline: "" },
  { enabled: true, assigneeId: "", kind: "ACCEPTANCE_TEST", deadline: "" },
  { enabled: true, assigneeId: "", kind: "ROLLOUT", deadline: "" },
];

type SimilarIssue = {
  id: string;
  title: string;
  description?: string | null;
};

type UserOption = {
  id: string;
  displayName: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

const phaseLabel = (kind: string) =>
  (
    {
      INVESTIGATION: "Investigation",
      PROPOSE_SOLUTION: "Propose solution",
      DEVELOPMENT: "Development",
      ACCEPTANCE_TEST: "Acceptance test",
      ROLLOUT: "Rollout",
    } as Record<string, string>
  )[kind] ?? "Phase";

const isOnOrBefore = (value?: string, limit?: string) => {
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

export default function NewIssuePage() {
  const router = useRouter();
  const api = useApi();
  const { token, username } = useAuth();
  const { recoveries } = useHealth();
  const isAuthed = Boolean(token || username);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueDeadline, setIssueDeadline] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [phases, setPhases] = useState<PhaseDraft[]>(defaultPhases);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [similarIssues, setSimilarIssues] = useState<SimilarIssue[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    let active = true;
    async function loadProjects() {
      setOptionsError(null);
      const projectsResponse = await api.GET("/projects", { params: { query: {} } });
      if (!active) {
        return;
      }
      if (projectsResponse.error) {
        setOptionsError("Unable to load options.");
        return;
      }
      setProjects(
        (projectsResponse.data ?? []).map((project) => ({
          id: project.id ?? "unknown",
          name: project.name ?? "Untitled",
        })),
      );
    }
    loadProjects();
    return () => {
      active = false;
    };
  }, [api, isAuthed, recoveries]);

  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    let active = true;
    async function loadUsers() {
      setOptionsError(null);
      const usersResponse = await api.GET("/users", {
        params: {
          query: projectId ? { projectId } : {},
        },
      });
      if (!active) {
        return;
      }
      if (usersResponse.error) {
        setOptionsError("Unable to load options.");
        return;
      }
      const nextUsers = (usersResponse.data ?? []).map((user) => ({
        id: user.id ?? "unknown",
        displayName: user.displayName ?? "Unknown",
      }));
      setUsers(nextUsers);
      setOwnerId((previousOwner) =>
        previousOwner && !nextUsers.some((user) => user.id === previousOwner)
          ? ""
          : previousOwner,
      );
    }
    loadUsers();
    return () => {
      active = false;
    };
  }, [api, isAuthed, projectId, recoveries]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthed) {
      return;
    }
    const query = `${title} ${description}`.trim();
    if (query.length < 5) {
      setSimilarIssues([]);
      setSimilarError(null);
      return;
    }
    let active = true;
    const handle = setTimeout(async () => {
      setSimilarLoading(true);
      setSimilarError(null);
      const { data, error: apiError } = await api.GET("/issues/similar", {
        params: { query: { query, limit: 5 } },
      });
      if (!active) {
        return;
      }
      if (apiError) {
        setSimilarError("Unable to check similar issues.");
        setSimilarIssues([]);
        setSimilarLoading(false);
        return;
      }
      setSimilarIssues(
        (data ?? []).map((issue) => ({
          id: issue.id ?? "unknown",
          title: issue.title ?? "Untitled",
          description: issue.description ?? null,
        })),
      );
      setSimilarLoading(false);
    }, 400);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [api, description, isAuthed, title, recoveries]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Sign in to create issues.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Issues
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          New issue
        </h1>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/90 p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          if (
            !title.trim() ||
            !description.trim() ||
            !ownerId.trim() ||
            !projectId.trim()
          ) {
            setError("Title, description, owner, and project are required.");
            return;
          }
          if (
            phases.some(
              (phase) =>
                phase.enabled &&
                phase.deadline &&
                !isOnOrBefore(phase.deadline, issueDeadline),
            )
          ) {
            setError("Phase deadlines must be on or before the issue deadline.");
            return;
          }
          setSaving(true);
          const { data, error: apiError } = await api.POST("/issues", {
            body: {
              title,
              description,
              ownerId,
              projectId,
              deadline: issueDeadline || undefined,
              phases: phases
                .filter((phase) => phase.enabled && phase.assigneeId && phase.kind)
                .map((phase) => ({
                  name: phaseLabel(phase.kind),
                  assigneeId: phase.assigneeId,
                  kind: phase.kind,
                  deadline: phase.deadline || undefined,
                })),
            },
          });
          if (apiError || !data) {
            setError("Unable to create issue.");
            setSaving(false);
            return;
          }
          router.push(`/issues/${data.id}`);
        }}
      >
        {optionsError && (
          <p className="text-xs text-rose-600">{optionsError}</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Title
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Issue title"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Description
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What happened and what needs to change?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Project ID
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                list="project-options"
                placeholder="project-123"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Issue deadline
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
              type="date"
              value={issueDeadline}
              onChange={(event) => setIssueDeadline(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Owner ID
            </label>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                list="user-options"
                placeholder="user-123"
              />
              <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
                ▾
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Phases</h2>
          </div>
          {phases.map((phase, index) => (
            <div
              key={`phase-${index}`}
              className="grid gap-2 rounded-2xl border border-slate-200/60 bg-white/90 p-4 md:grid-cols-2"
            >
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2"
                  type="button"
                  onClick={() =>
                    setPhases((prev) =>
                      prev.map((item, idx) =>
                        idx === index
                          ? { ...item, enabled: !item.enabled }
                          : item,
                      ),
                    )
                  }
                >
                  <Icon name={phase.enabled ? "check" : "x"} size={12} />
                  <span
                    className={`relative block h-5 w-10 rounded-full border transition ${
                      phase.enabled
                        ? "border-emerald-400 bg-emerald-400"
                        : "border-slate-200 bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 block h-4 w-4 rounded-full bg-white transition ${
                        phase.enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </span>
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  {phaseLabel(phase.kind)}
                </span>
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  placeholder="Assignee ID"
                  value={phase.assigneeId}
                  list="user-options"
                  disabled={!phase.enabled}
                  onChange={(event) =>
                    setPhases((prev) =>
                      prev.map((item, idx) =>
                        idx === index
                          ? { ...item, assigneeId: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <span className="pointer-events-none absolute right-2 top-2 text-xs text-slate-400">
                  ▾
                </span>
              </div>
              <div className="md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Deadline
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  type="date"
                  max={issueDeadline || undefined}
                  value={phase.deadline}
                  disabled={!phase.enabled}
                  onChange={(event) =>
                    setPhases((prev) =>
                      prev.map((item, idx) =>
                        idx === index
                          ? { ...item, deadline: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                {!isOnOrBefore(phase.deadline, issueDeadline) && (
                  <p className="mt-2 text-xs text-rose-600">
                    Phase deadline must be on or before the issue deadline.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Similar issues
            </h2>
            {similarLoading && (
              <span className="text-xs text-slate-500">Checking…</span>
            )}
          </div>
          {similarError && (
            <p className="text-xs text-rose-600">{similarError}</p>
          )}
          {!similarLoading && !similarError && similarIssues.length === 0 && (
            <p className="text-xs text-slate-500">
              No similar issues found yet.
            </p>
          )}
          {similarIssues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700"
            >
              <p className="font-semibold text-slate-900">{issue.title}</p>
              {issue.description && (
                <p className="mt-1 text-slate-500">
                  {issue.description.length > 120
                    ? `${issue.description.slice(0, 120)}…`
                    : issue.description}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white"
            type="submit"
            disabled={saving}
          >
            <Icon name="plus" size={12} />
            {saving ? "Saving…" : "Create issue"}
          </button>
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
        <datalist id="user-options">
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </datalist>
        <datalist id="project-options">
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </datalist>
      </form>
    </div>
  );
}
