"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/tooltip";

export type ProgressSegment = {
  color: string;
  count: number;
  tooltip?: ReactNode;
  separator?: boolean;
  onClick?: () => void;
};

type IssueProgressBarProps = {
  progressTone?: string;
  progressSegments?: ProgressSegment[];
  progressTotal?: number;
};

export function IssueProgressBar({
  progressTone,
  progressSegments,
  progressTotal,
}: IssueProgressBarProps) {
  if (!progressTone && (!progressSegments || progressSegments.length === 0)) {
    return null;
  }
  return (
    <div className="relative h-1.5 w-full">
      <div className="pointer-events-none absolute inset-0 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {progressSegments
          ? (() => {
              const total =
                progressTotal ??
                progressSegments.reduce((sum, segment) => sum + segment.count, 0);
              return progressSegments.map((segment, index) => {
                const width = total > 0 ? (segment.count / total) * 100 : 0;
                if (width <= 0) {
                  return null;
                }
                return (
                  <span
                    key={`${segment.color}-${index}`}
                    className={`${segment.color} ${segment.separator ? "border-l border-white/70" : ""}`}
                    style={{ width: `${width}%` }}
                  />
                );
              });
            })()
          : progressTone && <span className={`block h-1.5 w-full ${progressTone}`} />}
      </div>
      {progressSegments && (
        <div className="absolute inset-0 flex h-1.5 w-full overflow-visible">
          {(() => {
            const total =
              progressTotal ??
              progressSegments.reduce((sum, segment) => sum + segment.count, 0);
            return progressSegments.map((segment, index) => {
              const width = total > 0 ? (segment.count / total) * 100 : 0;
              if (width <= 0) {
                return null;
              }
              if (!segment.tooltip) {
                return (
                  <span
                    key={`${segment.color}-${index}`}
                    className="block h-3 -mt-1 cursor-pointer"
                    style={{ width: `${width}%` }}
                    onClick={segment.onClick}
                  />
                );
              }
              return (
                <span
                  key={`${segment.color}-${index}`}
                  className="group relative flex h-3 -mt-1 cursor-pointer"
                  style={{ width: `${width}%` }}
                  onClick={segment.onClick}
                >
                  <span className="block h-3 w-full bg-transparent" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[240px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {segment.tooltip}
                  </span>
                </span>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
