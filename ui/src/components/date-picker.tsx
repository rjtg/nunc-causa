"use client";

import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { Icon } from "@/components/icons";

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

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  max?: string;
};

export function DatePicker({
  value,
  onChange,
  onSave,
  onCancel,
  onClear,
  max,
}: DatePickerProps) {
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const maxDate = parseIsoDate(max);

  return (
    <div className="space-y-2">
      <DayPicker
        mode="single"
        numberOfMonths={1}
        selected={selected}
        onSelect={(day) => onChange(formatIsoDate(day ?? undefined))}
        disabled={maxDate ? { after: maxDate } : undefined}
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
        }}
      />
      {(onSave || onCancel || onClear) && (
        <div className="flex justify-end gap-2">
          {(value || onClear) && (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              type="button"
              onClick={() => {
                if (onClear) {
                  onClear();
                  return;
                }
                onChange("");
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
