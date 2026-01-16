"use client";

import { useRef } from "react";

type DatePickerFieldsProps =
  | {
      mode: "single";
      label: string;
      value: string;
      onChange: (value: string) => void;
      min?: string;
      max?: string;
      inputRef?: (node: HTMLInputElement | null) => void;
    }
  | {
      mode: "range";
      startLabel?: string;
      endLabel?: string;
      startValue: string;
      endValue: string;
      onChange: (next: { start: string; end: string }) => void;
      startMin?: string;
      startMax?: string;
      endMin?: string;
      endMax?: string;
      startInputRef?: (node: HTMLInputElement | null) => void;
      endInputRef?: (node: HTMLInputElement | null) => void;
    };

export function DatePickerFields(props: DatePickerFieldsProps) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  if (props.mode === "single") {
    return (
      <label className="text-[11px] text-slate-500">
        {props.label}
        <input
          ref={(node) => {
            startRef.current = node;
            props.inputRef?.(node);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
          type="date"
          min={props.min}
          max={props.max}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      <label className="text-[11px] text-slate-500">
        {props.startLabel ?? "Start"}
        <input
          ref={(node) => {
            startRef.current = node;
            props.startInputRef?.(node);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
          type="date"
          min={props.startMin}
          max={props.startMax}
          value={props.startValue}
          onChange={(event) =>
            props.onChange({ start: event.target.value, end: props.endValue })
          }
        />
      </label>
      <label className="text-[11px] text-slate-500">
        {props.endLabel ?? "Due"}
        <input
          ref={(node) => {
            endRef.current = node;
            props.endInputRef?.(node);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
          type="date"
          min={props.endMin}
          max={props.endMax}
          value={props.endValue}
          onChange={(event) =>
            props.onChange({ start: props.startValue, end: event.target.value })
          }
        />
      </label>
    </div>
  );
}
