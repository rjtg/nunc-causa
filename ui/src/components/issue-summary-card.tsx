"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Tooltip } from "@/components/tooltip";
import { IssueProgressBar } from "@/components/issue-progress-bar";

type IssueSummaryCardProps = {
  id: string;
  title: string;
  description?: string | null;
  descriptionTooltip?: ReactNode;
  showDescription?: boolean;
  href?: string;
  onSelect?: () => void;
  note?: string;
  tone?: "default" | "muted";
  tooltip?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  progressTone?: string;
  progressSegments?: Array<{
    color: string;
    count: number;
    tooltip?: ReactNode;
    separator?: boolean;
    style?: CSSProperties;
    segments?: Array<{
      color: string;
      count: number;
      tooltip?: ReactNode;
      separator?: boolean;
      style?: CSSProperties;
    }>;
  }>;
  progressTotal?: number;
  children?: ReactNode;
  className?: string;
};

export function IssueSummaryCard({
  id,
  title,
  description,
  descriptionTooltip,
  showDescription = true,
  href,
  onSelect,
  note,
  tone = "default",
  tooltip,
  left,
  right,
  progressTone,
  progressSegments,
  progressTotal,
  children,
  className,
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
      className={`block rounded-lg border px-3 py-2 ${toneClasses} hover:border-slate-300 ${className ?? ""}`}
      onClick={(event) => {
        if ((event.target as HTMLElement | null)?.closest("[data-no-link]")) {
          event.preventDefault();
          return;
        }
        if (event.defaultPrevented) {
          return;
        }
        if (onSelect) {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {note && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {note}
        </p>
      )}
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {left}
          <Tooltip content={tooltip ?? title}>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">{id}</p>
              <p className="truncate text-xs font-semibold text-slate-700">
                {title}
              </p>
            </div>
          </Tooltip>
        </div>
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
      {showDescription && description && (
        <Tooltip content={descriptionTooltip ?? description}>
          <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">
            {description}
          </p>
        </Tooltip>
      )}
      {children}
    </Wrapper>
  );
}
