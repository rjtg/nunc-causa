"use client";

import { DateRangePicker } from "@/components/date-range-picker";

type DateRangePopoverProps = {
  open: boolean;
  shift: number;
  contentId: string;
  startValue: string;
  endValue: string;
  endMax?: string;
  onChange: (start: string, end: string) => void;
  onClear: () => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  warning?: string | null;
};

export function DateRangePopover({
  open,
  shift,
  contentId,
  startValue,
  endValue,
  endMax,
  onChange,
  onClear,
  onSave,
  onCancel,
  warning,
}: DateRangePopoverProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute left-1/2 top-full z-20 mt-2 inline-block w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-lg"
      data-task-date-popover-content={contentId}
      style={{
        transform: `translateX(calc(-50% + ${shift}px))`,
      }}
    >
      <DateRangePicker
        startValue={startValue}
        endValue={endValue}
        endMax={endMax}
        onChange={onChange}
        onClear={onClear}
        onSave={onSave}
        onCancel={onCancel}
      />
      {warning && <p className="mt-2 text-xs text-rose-600">{warning}</p>}
    </div>
  );
}
