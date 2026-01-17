"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useApi } from "@/lib/api/use-api";
import { useHealth } from "@/lib/health/context";
import type {
  FacetOption,
  FacetResponse,
  FilterAction,
  FilterState,
  Filters,
  IssueSummary,
  ProjectOption,
  UserOption,
} from "./types";

const emptyFilters: Filters = {
  query: "",
  ownerId: "",
  assigneeId: "",
  memberId: "",
  projectId: "",
  status: "",
  phaseKind: "",
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "sync":
      return { filters: action.payload, appliedFilters: action.payload };
    case "update":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case "apply":
      return { ...state, appliedFilters: state.filters };
    case "reset":
      return { filters: emptyFilters, appliedFilters: emptyFilters };
    default:
      return state;
  }
}

type UseIssueSearchProps = {
  initialFilters: Filters;
  ready: boolean;
  isAuthed: boolean;
};

export function useIssueSearch({
  initialFilters,
  ready,
  isAuthed,
}: UseIssueSearchProps) {
  const api = useApi();
  const { recoveries } = useHealth();
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [facetError, setFacetError] = useState<string | null>(null);
  const [facets, setFacets] = useState<FacetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [filterState, dispatch] = useReducer(
    filterReducer,
    initialFilters,
    (initial) => ({ filters: initial, appliedFilters: initial }),
  );

  const facetCounts = useMemo(() => {
    const counts = (options: FacetOption[]) =>
      options.reduce<Record<string, number>>((acc, option) => {
        if (option.id) {
          acc[option.id] = option.count ?? 0;
        }
        return acc;
      }, {});
    return {
      owners: counts(facets?.owners ?? []),
      assignees: counts(facets?.assignees ?? []),
      projects: counts(facets?.projects ?? []),
    };
  }, [facets]);

  const requestUsers = useCallback(async () => {
    if (!ready || !isAuthed) {
      return;
    }
    const { data, error: apiError } = await api.GET("/users", {
      params: { query: {} },
    });
    if (apiError) {
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
  }, [api, isAuthed, ready]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    dispatch({ type: "sync", payload: initialFilters });
  }, [initialFilters, isAuthed, ready]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    setLoading(true);
    setError(null);
    const query = {
      query: filterState.appliedFilters.query || undefined,
      ownerId: filterState.appliedFilters.ownerId || undefined,
      assigneeId: filterState.appliedFilters.assigneeId || undefined,
      memberId: filterState.appliedFilters.memberId || undefined,
      projectId: filterState.appliedFilters.projectId || undefined,
      status: filterState.appliedFilters.status || undefined,
      phaseKind: filterState.appliedFilters.phaseKind || undefined,
    };
    api
      .GET("/issues", { params: { query } })
      .then(({ data, error: apiError }) => {
        if (apiError || !data) {
          setError("Unable to load issues.");
          return;
        }
        setIssues(
          data.map((issue) => ({
            id: issue.id ?? "unknown",
            title: issue.title ?? "Untitled",
            description: issue.description ?? null,
            ownerId: issue.ownerId ?? "Unassigned",
            status: issue.status ?? "UNKNOWN",
            deadline: issue.deadline ?? null,
            phaseCount: issue.phaseCount ?? 0,
            phaseStatusCounts: issue.phaseStatusCounts ?? null,
            phaseProgress: issue.phaseProgress ?? [],
          })),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [api, filterState.appliedFilters, isAuthed, ready, recoveries]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    let active = true;
    async function loadFacets() {
      setFacetError(null);
      const query = {
        query: filterState.appliedFilters.query || undefined,
        ownerId: filterState.appliedFilters.ownerId || undefined,
        assigneeId: filterState.appliedFilters.assigneeId || undefined,
        memberId: filterState.appliedFilters.memberId || undefined,
        projectId: filterState.appliedFilters.projectId || undefined,
        status: filterState.appliedFilters.status || undefined,
        phaseKind: filterState.appliedFilters.phaseKind || undefined,
      };
      const { data, error: apiError } = await api.GET("/issues/facets", {
        params: { query },
      });
      if (!active) {
        return;
      }
      if (apiError || !data) {
        setFacetError("Unable to load facets.");
        setFacets(null);
        return;
      }
      setFacets(data as FacetResponse);
    }
    loadFacets();
    return () => {
      active = false;
    };
  }, [api, filterState.appliedFilters, isAuthed, ready, recoveries]);

  useEffect(() => {
    if (!ready || !isAuthed) {
      return;
    }
    let active = true;
    async function loadOptions() {
      setOptionsError(null);
      const [usersResponse, projectsResponse] = await Promise.all([
        api.GET("/users", { params: { query: {} } }),
        api.GET("/projects", { params: { query: {} } }),
      ]);
      if (!active) {
        return;
      }
      if (usersResponse.error || projectsResponse.error) {
        setOptionsError("Unable to load filter options.");
        return;
      }
      setUsers(
        (usersResponse.data ?? []).map((user) => ({
          id: user.id ?? "unknown",
          displayName: user.displayName ?? "Unknown",
          openIssueCount: user.openIssueCount ?? 0,
          openPhaseCount: user.openPhaseCount ?? 0,
          openTaskCount: user.openTaskCount ?? 0,
        })),
      );
      setProjects(
        (projectsResponse.data ?? []).map((project) => ({
          id: project.id ?? "unknown",
          name: project.name ?? "Untitled",
        })),
      );
    }
    loadOptions();
    return () => {
      active = false;
    };
  }, [api, isAuthed, ready, recoveries]);

  return {
    filterState,
    dispatch,
    issues,
    setIssues,
    users,
    setUsers,
    projects,
    facets,
    facetCounts,
    optionsError,
    facetError,
    error,
    loading,
    requestUsers,
  };
}
