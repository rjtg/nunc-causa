"use client";

import type { ReactNode } from "react";
import type { IssueDetail, Phase } from "../types";
import { phaseCardClass } from "./phase-board-utils";

type PhaseCardProps = {
  phase: Phase;
  issue: IssueDetail;
  statusError?: string | null;
  children: ReactNode;
};

export function PhaseCard({
  phase,
  issue,
  statusError,
  children,
}: PhaseCardProps) {
  return (
    <div
      id={`phase-${phase.id}`}
      className={`rounded-2xl border p-4 ${phaseCardClass(
        phase,
        "border-slate-200/60",
      )}`}
    >
      {children}
      {statusError && <p className="text-xs text-rose-600">{statusError}</p>}
    </div>
  );
}
