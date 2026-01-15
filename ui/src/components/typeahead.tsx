import { useEffect, useMemo, useState } from "react";

type Option = {
  value: string;
  label?: string;
  description?: string;
  meta?: string;
};

type TypeaheadProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxItems?: number;
};

export function Typeahead({
  value,
  onChange,
  options,
  placeholder,
  className,
  inputClassName,
  maxItems = 8,
}: TypeaheadProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized.length
      ? options.filter((option) => {
          const label = option.label ?? option.value;
          return (
            option.value.toLowerCase().includes(normalized) ||
            label.toLowerCase().includes(normalized) ||
            (option.description ?? "").toLowerCase().includes(normalized)
          );
        })
      : options;
    return filtered.slice(0, maxItems);
  }, [options, query, maxItems]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        className={
          inputClassName ??
          "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        }
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);
          onChange(nextValue);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.ctrlKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
        }}
      />
      <span className="pointer-events-none absolute right-3 top-2 text-xs text-slate-400">
        ▾
      </span>
      {open && (
        <div className="absolute z-10 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1 text-xs text-slate-700 shadow-lg">
          {visibleOptions.length === 0 && (
            <div className="px-3 py-2 text-slate-400">No matches.</div>
          )}
          {visibleOptions.map((option) => {
            const label = option.label ?? option.value;
            return (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.value);
                  setQuery(option.value);
                  setOpen(false);
                }}
              >
                <span>
                  <span className="font-semibold">{label}</span>
                  {option.description && (
                    <span className="block text-[11px] text-slate-500">
                      {option.description}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-[11px] text-slate-400">
                  {option.meta && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {option.meta}
                    </span>
                  )}
                  {label !== option.value && <span>{option.value}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
