import type { ReactNode } from "react";

type TooltipProps = {
  content?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }
  return (
    <span className={`group relative inline-flex ${className ?? ""}`}>
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[240px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {content}
      </span>
    </span>
  );
}
