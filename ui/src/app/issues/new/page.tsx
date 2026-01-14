"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

type PhaseDraft = {
  name: string;
  assigneeId: string;
  kind: string;
};

const emptyPhase: PhaseDraft = { name: "", assigneeId: "", kind: "" };

export default function NewIssuePage() {
  const router = useRouter();
  const api = useApi();
  const { token, username } = useAuth();
  const isAuthed = Boolean(token || username);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [phases, setPhases] = useState<PhaseDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Connect your API credentials to create issues.
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
          if (!title.trim() || !ownerId.trim() || !projectId.trim()) {
            setError("Title, owner, and project are required.");
            return;
          }
          setSaving(true);
          const { data, error: apiError } = await api.POST("/issues", {
            body: {
              title,
              ownerId,
              projectId,
              phases: phases
                .filter((phase) => phase.name && phase.assigneeId)
                .map((phase) => ({
                  name: phase.name,
                  assigneeId: phase.assigneeId,
                  kind: phase.kind || null,
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
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Project ID
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              placeholder="project-123"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Owner ID
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              placeholder="user-123"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Phases</h2>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700"
              type="button"
              onClick={() => setPhases((prev) => [...prev, { ...emptyPhase }])}
            >
              Add phase
            </button>
          </div>
          {phases.length === 0 && (
            <p className="text-xs text-slate-500">
              Add phases to assign work up front (optional).
            </p>
          )}
          {phases.map((phase, index) => (
            <div
              key={`phase-${index}`}
              className="grid gap-2 rounded-2xl border border-slate-200/60 bg-white/90 p-4 md:grid-cols-3"
            >
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                placeholder="Phase name"
                value={phase.name}
                onChange={(event) =>
                  setPhases((prev) =>
                    prev.map((item, idx) =>
                      idx === index
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                placeholder="Assignee ID"
                value={phase.assigneeId}
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
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  placeholder="Kind (optional)"
                  value={phase.kind}
                  onChange={(event) =>
                    setPhases((prev) =>
                      prev.map((item, idx) =>
                        idx === index
                          ? { ...item, kind: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500"
                  type="button"
                  onClick={() =>
                    setPhases((prev) => prev.filter((_, idx) => idx !== index))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : "Create issue"}
          </button>
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
