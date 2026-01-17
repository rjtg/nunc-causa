"use client";

import { Icon } from "@/components/icons";
import { DatePicker } from "@/components/date-picker";

type DatePopoverProps = {
  open: boolean;
  shift: number;
  label: string;
  value: string;
  max?: string;
  contentId: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onClear: () => void;
  onSave: () => void | Promise<void>;
  warning?: string | null;
};

export function DatePopover({
  open,
  shift,
  label,
  value,
  max,
  contentId,
  onClose,
  onChange,
  onClear,
  onSave,
  warning,
}: DatePopoverProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute left-1/2 top-full z-20 mt-2 inline-block w-fit max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-lg"
      data-phase-deadline-popover-content={contentId}
      style={{
        transform: `translateX(calc(-50% + ${shift}px))`,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <button
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          type="button"
          onClick={onClose}
        >
          <Icon name="x" size={12} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <DatePicker
          value={value}
          max={max}
          onChange={onChange}
          onCancel={onClose}
          onClear={onClear}
          onSave={onSave}
        />
        {warning && <p className="text-xs text-rose-600">{warning}</p>}
      </div>
    </div>
  );
}
