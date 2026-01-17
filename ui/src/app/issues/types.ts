export type IssueSummary = {
  id: string;
  title: string;
  description?: string | null;
  ownerId: string;
  status: string;
  deadline?: string | null;
  phaseCount: number;
  phaseStatusCounts?: Record<string, number> | null;
  phaseProgress?: {
    phaseId: string;
    phaseName: string;
    assigneeId: string;
    phaseKind?: string | null;
    deadline?: string | null;
    status: string;
    taskStatusCounts: Record<string, number>;
    taskTotal: number;
  }[];
};

export type FacetOption = {
  id?: string | null;
  count?: number | null;
};

export type FacetResponse = {
  owners: FacetOption[];
  assignees: FacetOption[];
  projects: FacetOption[];
  statuses: FacetOption[];
  phaseKinds: FacetOption[];
};

export type UserOption = {
  id: string;
  displayName: string;
  openIssueCount?: number | null;
  openPhaseCount?: number | null;
  openTaskCount?: number | null;
};

export type ProjectOption = {
  id: string;
  name: string;
};

export type Filters = {
  query: string;
  ownerId: string;
  assigneeId: string;
  memberId: string;
  projectId: string;
  status: string;
  phaseKind: string;
};

export type FilterState = {
  filters: Filters;
  appliedFilters: Filters;
};

export type FilterAction =
  | { type: "sync"; payload: Filters }
  | { type: "update"; payload: Partial<Filters> }
  | { type: "apply" }
  | { type: "reset" };
