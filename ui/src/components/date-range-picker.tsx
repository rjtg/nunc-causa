"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { Icon } from "@/components/icons";

type RangeValue = {
  start: string;
  end: string;
};

const parseIsoDate = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatIsoDate = (value: Date | undefined) => {
  if (!value) {
    return "";
  }
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type DateRangePickerProps = {
  startValue: string;
  endValue: string;
  onChange: (value: RangeValue) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  endMax?: string;
};

export function DateRangePicker({
  startValue,
  endValue,
  onChange,
  onSave,
  onCancel,
  onClear,
  endMax,
}: DateRangePickerProps) {
  const from = parseIsoDate(startValue);
  const to = parseIsoDate(endValue);
  const endMaxDate = parseIsoDate(endMax);
  const selected = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to],
  );

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      onChange({ start: "", end: "" });
      return;
    }
    const nextStart = range.from ? formatIsoDate(range.from) : "";
    const nextEnd = range.to ? formatIsoDate(range.to) : "";
    onChange({ start: nextStart, end: nextEnd });
  };

  return (
    <div className="space-y-2">
      <DayPicker
        mode="range"
        numberOfMonths={1}
        selected={selected}
        onSelect={handleSelect}
        disabled={endMaxDate ? { after: endMaxDate } : undefined}
        className="rounded-lg border border-slate-200 bg-white p-2 w-fit"
        classNames={{
          months: "flex flex-col",
          month: "space-y-2",
          caption: "flex items-center justify-between text-xs font-semibold text-slate-600",
          nav: "flex items-center gap-1",
          nav_button:
            "h-6 w-6 rounded-full border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50",
          table: "w-full border-collapse",
          head_row: "flex justify-between",
          head_cell: "w-7 text-[10px] font-semibold text-slate-400",
          row: "mt-1 flex justify-between",
          cell: "h-7 w-7 text-center text-xs",
          day: "h-7 w-7 rounded-full text-xs hover:bg-slate-100",
          day_selected: "bg-slate-900 text-white hover:bg-slate-900",
          day_today: "border border-slate-300",
          day_range_start: "bg-slate-900 text-white",
          day_range_end: "bg-slate-900 text-white",
          day_range_middle: "bg-slate-100 text-slate-700",
        }}
      />
      {(onSave || onCancel || onClear) && (
        <div className="flex justify-end gap-2">
          {(startValue || endValue || onClear) && (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              type="button"
              onClick={() => {
                if (onClear) {
                  onClear();
                  return;
                }
                onChange({ start: "", end: "" });
              }}
            >
              <Icon name="x" size={12} />
              Clear
            </button>
          )}
          {onCancel && (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              type="button"
              onClick={onCancel}
            >
              <Icon name="x" size={12} />
              Cancel
            </button>
          )}
          {onSave && (
            <button
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              type="button"
              onClick={onSave}
            >
              <Icon name="check" size={12} />
              Save
            </button>
          )}
        </div>
      )}
    </div>
  );
}
