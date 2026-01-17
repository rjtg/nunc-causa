"use client";

import { Icon } from "@/components/icons";
import { Typeahead } from "@/components/typeahead";
import type { FacetResponse, FilterState, ProjectOption, UserOption } from "../types";
import { issueStatusLabel } from "../issue-list-utils";

type IssueSearchFiltersProps = {
  filterState: FilterState;
  facets: FacetResponse | null;
  facetCounts: {
    owners: Record<string, number>;
    assignees: Record<string, number>;
    projects: Record<string, number>;
  };
  users: UserOption[];
  projects: ProjectOption[];
  optionsError?: string | null;
  facetError?: string | null;
  onUpdate: (payload: Partial<FilterState["filters"]>) => void;
  onApply: () => void;
  onReset: () => void;
};

export function IssueSearchFilters({
  filterState,
  facets,
  facetCounts,
  users,
  projects,
  optionsError,
  facetError,
  onUpdate,
  onApply,
  onReset,
}: IssueSearchFiltersProps) {
  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Filters
        </h2>
        <button
          className="inline-flex items-center gap-2 text-xs text-slate-500 underline-offset-2 hover:underline"
          type="button"
          onClick={onReset}
        >
          <Icon name="reset" size={12} />
          Reset
        </button>
      </div>
      {(optionsError || facetError) && (
        <p className="text-xs text-rose-600">{optionsError ?? facetError}</p>
      )}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Search
        </label>
        <Typeahead
          value={filterState.filters.query}
          onChange={(value) => onUpdate({ query: value })}
          options={[]}
          placeholder="Title or description"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Owner
        </label>
        <Typeahead
          value={filterState.filters.ownerId}
          onChange={(value) => onUpdate({ ownerId: value })}
          options={users
            .filter((user) => {
              if (!facets) {
                return true;
              }
              const validIds = new Set(
                facets.owners.map((option) => option.id).filter(Boolean) as string[],
              );
              return validIds.size === 0 || validIds.has(user.id);
            })
            .map((user) => ({
              value: user.id,
              label: user.displayName,
              meta:
                facetCounts.owners[user.id] !== undefined
                  ? `${facetCounts.owners[user.id]} open`
                  : undefined,
            }))}
          placeholder="Owner"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Assignee
        </label>
        <Typeahead
          value={filterState.filters.assigneeId}
          onChange={(value) => onUpdate({ assigneeId: value })}
          options={users
            .filter((user) => {
              if (!facets) {
                return true;
              }
              const validIds = new Set(
                facets.assignees.map((option) => option.id).filter(Boolean) as string[],
              );
              return validIds.size === 0 || validIds.has(user.id);
            })
            .map((user) => ({
              value: user.id,
              label: user.displayName,
              meta:
                facetCounts.assignees[user.id] !== undefined
                  ? `${facetCounts.assignees[user.id]} open`
                  : undefined,
            }))}
          placeholder="Assignee"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Member
        </label>
        <Typeahead
          value={filterState.filters.memberId}
          onChange={(value) => onUpdate({ memberId: value })}
          options={users
            .filter((user) => {
              if (!facets) {
                return true;
              }
              const validIds = new Set(
                [...facets.owners, ...facets.assignees]
                  .map((option) => option.id)
                  .filter(Boolean) as string[],
              );
              return validIds.size === 0 || validIds.has(user.id);
            })
            .map((user) => ({
              value: user.id,
              label: user.displayName,
              meta:
                facetCounts.assignees[user.id] !== undefined
                  ? `${facetCounts.assignees[user.id]} open`
                  : undefined,
            }))}
          placeholder="Team member"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Project
        </label>
        <Typeahead
          value={filterState.filters.projectId}
          onChange={(value) => onUpdate({ projectId: value })}
          options={projects
            .filter((project) => {
              if (!facets) {
                return true;
              }
              const validIds = new Set(
                facets.projects.map((option) => option.id).filter(Boolean) as string[],
              );
              return validIds.size === 0 || validIds.has(project.id);
            })
            .map((project) => ({
              value: project.id,
              label: project.name,
              meta:
                facetCounts.projects[project.id] !== undefined
                  ? `${facetCounts.projects[project.id]} open`
                  : undefined,
            }))}
          placeholder="Project"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Phase kind
        </label>
        <Typeahead
          value={filterState.filters.phaseKind}
          onChange={(value) => onUpdate({ phaseKind: value })}
          options={(facets?.phaseKinds ?? [
            { id: "INVESTIGATION" },
            { id: "PROPOSE_SOLUTION" },
            { id: "DEVELOPMENT" },
            { id: "ACCEPTANCE_TEST" },
            { id: "ROLLOUT" },
          ])
            .map((option) => option.id)
            .filter(Boolean)
            .map((kind) => ({
              value: kind as string,
            }))}
          placeholder="Phase kind"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Status
        </label>
        <Typeahead
          value={filterState.filters.status}
          onChange={(value) => onUpdate({ status: value })}
          options={(facets?.statuses ?? [
            { id: "CREATED" },
            { id: "NOT_ACTIVE" },
            { id: "IN_ANALYSIS" },
            { id: "IN_DEVELOPMENT" },
            { id: "IN_TEST" },
            { id: "IN_ROLLOUT" },
            { id: "DONE" },
            { id: "FAILED" },
          ])
            .map((option) => option.id)
            .filter(Boolean)
            .map((status) => ({
              value: status as string,
              label: issueStatusLabel(status as string),
            }))}
          placeholder="Status"
        />
      </div>
      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
        type="submit"
      >
        <Icon name="filter" size={12} />
        Apply filters
      </button>
    </form>
  );
}
