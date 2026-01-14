"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";

type Project = {
  id: string;
  name: string;
  orgId: string;
  teamId: string;
};

export default function ProjectsPage() {
  const api = useApi();
  const { token, username, ready } = useAuth();
  const isAuthed = Boolean(token || username);
  const [projects, setProjects] = useState<Project[]>([]);
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
      const { data, error: apiError } = await api.GET("/projects", {
        params: { query: {} },
      });
      if (!active) {
        return;
      }
      if (apiError || !data) {
        setError("Unable to load projects.");
        setLoading(false);
        return;
      }
      setProjects(
        data.map((project) => ({
          id: project.id ?? "unknown",
          name: project.name ?? "Untitled",
          orgId: project.orgId ?? "—",
          teamId: project.teamId ?? "—",
        })),
      );
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [api, isAuthed, ready]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Projects
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Project portfolio
        </h1>
      </header>

      {ready && !isAuthed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Sign in to browse projects.
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading projects…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && (
        <div className="grid gap-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
          {projects.length === 0 && (
            <p className="text-sm text-slate-500">No projects found.</p>
          )}
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
            >
              <div>
                <span className="font-semibold text-slate-900">
                  {project.name}
                </span>
                <p className="text-xs text-slate-500">{project.id}</p>
              </div>
              <span>Team: {project.teamId}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
