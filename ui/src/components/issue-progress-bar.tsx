"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tooltip } from "@/components/tooltip";

export type ProgressSegment = {
  color: string;
  count: number;
  tooltip?: ReactNode;
  separator?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  segments?: ProgressSegment[];
};

type IssueProgressBarProps = {
  progressTone?: string;
  progressSegments?: ProgressSegment[];
  progressTotal?: number;
  showHover?: boolean;
};

export function IssueProgressBar({
  progressTone,
  progressSegments,
  progressTotal,
  showHover = true,
}: IssueProgressBarProps) {
  if (!progressTone && (!progressSegments || progressSegments.length === 0)) {
    return null;
  }
  const hasOutline = progressSegments?.some(
    (segment) =>
      segment.style?.border ||
      segment.style?.outline ||
      segment.segments?.some((child) => child.style?.border || child.style?.outline),
  );
  const barHeightClass = hasOutline ? "h-3" : "h-1.5";
  const overlayHeightClass = hasOutline ? "h-5 -mt-1" : "h-3 -mt-1";
  const overflowClass = hasOutline ? "overflow-visible" : "overflow-hidden";
  const hasNested = progressSegments?.some(
    (segment) => segment.segments && segment.segments.length > 0,
  );
  const flattenSegments = (
    segments: ProgressSegment[],
    parentCount: number,
    inherited: Pick<ProgressSegment, "tooltip" | "onClick"> = {},
  ): ProgressSegment[] => {
    const total = segments.reduce((sum, segment) => sum + segment.count, 0);
    return segments.flatMap((segment) => {
      const normalized = total > 0 ? (segment.count / total) * parentCount : 0;
      const merged = {
        ...segment,
        tooltip: segment.tooltip ?? inherited.tooltip,
        onClick: segment.onClick ?? inherited.onClick,
      };
      if (segment.segments && segment.segments.length > 0) {
        const children = flattenSegments(segment.segments, normalized, merged);
        if (segment.separator && children.length > 0) {
          children[0] = { ...children[0], separator: true };
        }
        return children;
      }
      return [{ ...merged, count: normalized }];
    });
  };
  const flatSegments =
    progressSegments && hasNested
      ? flattenSegments(
          progressSegments,
          progressTotal ??
            progressSegments.reduce((sum, segment) => sum + segment.count, 0),
        )
      : progressSegments;
  return (
    <div className={`relative ${barHeightClass} w-full`}>
      <div
        className={`pointer-events-none absolute inset-0 flex w-full rounded-full bg-slate-100 ${barHeightClass} ${overflowClass}`}
      >
        {flatSegments
          ? (() => {
              const total =
                progressTotal ??
                flatSegments.reduce((sum, segment) => sum + segment.count, 0);
              return flatSegments.map((segment, index) => {
                const width = total > 0 ? (segment.count / total) * 100 : 0;
                if (width <= 0) {
                  return null;
                }
                return (
                  <span
                    key={`${segment.color}-${index}`}
                    className={`block h-full ${segment.color} ${segment.separator ? "border-l border-white/70" : ""}`}
                    style={{ width: `${width}%`, ...segment.style }}
                  />
                );
              });
            })()
          : progressTone && (
            <span className={`block h-full w-full ${progressTone}`} />
          )}
      </div>
      {flatSegments && showHover && (
        <div className={`absolute inset-0 flex w-full overflow-visible ${barHeightClass}`}>
          {(() => {
            const total =
              progressTotal ??
              flatSegments.reduce((sum, segment) => sum + segment.count, 0);
            return flatSegments.map((segment, index) => {
              const width = total > 0 ? (segment.count / total) * 100 : 0;
              if (width <= 0) {
                return null;
              }
              if (!segment.tooltip) {
                return (
                  <span
                    key={`${segment.color}-${index}`}
                    className={`block cursor-pointer ${overlayHeightClass}`}
                    style={{ width: `${width}%` }}
                    onClick={segment.onClick}
                  />
                );
              }
              return (
                <span
                  key={`${segment.color}-${index}`}
                  className={`group relative flex cursor-pointer ${overlayHeightClass}`}
                  style={{ width: `${width}%` }}
                  onClick={segment.onClick}
                >
                  <span className={`block w-full bg-transparent ${overlayHeightClass}`} />
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
