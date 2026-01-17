"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/context";
import type { IssueDetail } from "./[issueId]/types";
import { IssueResultsList } from "./components/IssueResultsList";
import { IssueSearchFilters } from "./components/IssueSearchFilters";
import { useIssueSearch } from "./use-issue-search";
import type {
  Filters,
} from "./types";

export default function IssuesPage() {
  const api = useApi();
  const searchParams = useSearchParams();
  const { token, username, ready } = useAuth();
  const isAuthed = Boolean(token || username);
  const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail>>({});
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, string[]>>({});

  const updateIssueOwner = useCallback(
    async (issueId: string, ownerId: string | null) => {
      if (!ownerId) {
        throw new Error("Owner is required.");
      }
      const { data, error: apiError } = await api.PATCH("/issues/{issueId}/owner", {
        params: { path: { issueId } },
        body: { ownerId },
      });
      if (apiError || !data) {
        throw new Error("Unable to update owner.");
      }
      const updated = data as { id?: string; ownerId?: string };
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                ownerId: updated.ownerId ?? issue.ownerId,
              }
            : issue,
        ),
      );
    },
    [api],
  );

  const ensureIssueDetail = useCallback(
    async (issueId: string) => {
      if (issueDetails[issueId]) {
        return issueDetails[issueId];
      }
      const { data, error } = await api.GET("/issues/{issueId}", {
        params: { path: { issueId } },
      });
      if (!error && data) {
        const detail = data as IssueDetail;
        setIssueDetails((prev) => ({ ...prev, [issueId]: detail }));
        return detail;
      }
      return null;
    },
    [api, issueDetails],
  );

  const isIssueExpanded = (issueId: string) => expandedIssues.includes(issueId);

  const isPhaseExpanded = (issueId: string, phaseId: string) =>
    expandedPhases[issueId]?.includes(phaseId) ?? false;

  const toggleIssue = async (issueId: string) => {
    const expanded = isIssueExpanded(issueId);
    setExpandedIssues((current) =>
      expanded ? current.filter((id) => id !== issueId) : [...current, issueId],
    );
    if (!expanded) {
      await ensureIssueDetail(issueId);
    }
  };

  const togglePhase = (issueId: string, phaseId: string) => {
    setExpandedPhases((current) => {
      const currentExpanded = current[issueId] ?? [];
      const nextExpanded = currentExpanded.includes(phaseId)
        ? currentExpanded.filter((id) => id !== phaseId)
        : [...currentExpanded, phaseId];
      return {
        ...current,
        [issueId]: nextExpanded,
      };
    });
  };

  const queryFilters = useMemo(() => {
    const get = (key: keyof Filters) => searchParams.get(key) ?? "";
    return {
      query: get("query"),
      ownerId: get("ownerId"),
      assigneeId: get("assigneeId"),
      memberId: get("memberId"),
      projectId: get("projectId"),
      status: get("status"),
      phaseKind: get("phaseKind"),
    };
  }, [searchParams]);

  const {
    filterState,
    dispatch,
    issues,
    setIssues,
    users,
    projects,
    facets,
    facetCounts,
    optionsError,
    facetError,
    error,
    loading,
    requestUsers,
  } = useIssueSearch({
    initialFilters: queryFilters,
    ready,
    isAuthed,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Issues
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {filterState.appliedFilters.query
            ? `Search results for “${filterState.appliedFilters.query}”`
            : "All issues"}
        </h1>
        <p className="mt-2 text-xs text-slate-500">
          {issues.length} results · refine with filters
        </p>
      </header>

      {!ready && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Loading session…
        </div>
      )}

      {ready && !isAuthed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Sign in to load issues.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <IssueSearchFilters
          filterState={filterState}
          facets={facets}
          facetCounts={facetCounts}
          users={users}
          projects={projects}
          optionsError={optionsError}
          facetError={facetError}
          onUpdate={(payload) => dispatch({ type: "update", payload })}
          onApply={() => dispatch({ type: "apply" })}
          onReset={() => dispatch({ type: "reset" })}
        />

        <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
          {loading && (
            <p className="text-sm text-slate-500">Loading issues…</p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!loading && !error && issues.length === 0 && (
            <p className="text-sm text-slate-500">No issues found.</p>
          )}
          {issues.length > 0 && (
            <IssueResultsList
              issues={issues}
              issueDetails={issueDetails}
              users={users}
              ready={ready}
              isAuthed={isAuthed}
              onRequestUsers={requestUsers}
              onUpdateOwner={updateIssueOwner}
              onToggleIssue={toggleIssue}
              onTogglePhase={togglePhase}
              isIssueExpanded={isIssueExpanded}
              isPhaseExpanded={isPhaseExpanded}
            />
          )}
        </div>
      </div>
    </div>
  );
}
