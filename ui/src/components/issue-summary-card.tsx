"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Tooltip } from "@/components/tooltip";
import { IssueProgressBar } from "@/components/issue-progress-bar";

type IssueSummaryCardProps = {
  id: string;
  title: string;
  description?: string | null;
  href?: string;
  note?: string;
  tone?: "default" | "muted";
  tooltip?: ReactNode;
  right?: ReactNode;
  progressTone?: string;
  progressSegments?: Array<{ color: string; count: number; tooltip?: ReactNode; separator?: boolean }>;
  progressTotal?: number;
  children?: ReactNode;
};

export function IssueSummaryCard({
  id,
  title,
  description,
  href,
  note,
  tone = "default",
  tooltip,
  right,
  progressTone,
  progressSegments,
  progressTotal,
  children,
}: IssueSummaryCardProps) {
  const Wrapper: typeof Link | "div" = href ? Link : "div";
  const wrapperProps = href ? { href } : {};
  const toneClasses =
    tone === "muted"
      ? "border-slate-200 bg-slate-50"
      : "border-slate-200 bg-white";

  return (
    <Wrapper
      {...wrapperProps}
      className={`block rounded-lg border px-3 py-2 ${toneClasses} hover:border-slate-300`}
    >
      {note && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {note}
        </p>
      )}
      <div className="mt-1 flex items-center justify-between gap-3">
        <Tooltip content={tooltip ?? title}>
          <div>
            <p className="text-[11px] text-slate-500">{id}</p>
            <p className="text-xs font-semibold text-slate-700">{title}</p>
          </div>
        </Tooltip>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
      {(progressTone || progressSegments) && (
        <div className="mt-2">
          <IssueProgressBar
            progressTone={progressTone}
            progressSegments={progressSegments}
            progressTotal={progressTotal}
          />
        </div>
      )}
      {description && (
        <p className="mt-2 text-[11px] text-slate-500">{description}</p>
      )}
      {children}
    </Wrapper>
  );
}
