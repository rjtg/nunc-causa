"use client";

type StatusBadgeSelectProps = {
  value: string;
  options: string[];
  label: (value: string) => string;
  badgeClassName: (value: string) => string;
  optionClassName?: (value: string) => string;
  disabled?: boolean;
  onChange: (next: string) => void;
};

export function StatusBadgeSelect({
  value,
  options,
  label,
  badgeClassName,
  optionClassName,
  disabled = false,
  onChange,
}: StatusBadgeSelectProps) {
  return (
    <select
      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${badgeClassName(
        value,
      )}`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option
          key={option}
          value={option}
          className={optionClassName ? optionClassName(option) : undefined}
        >
          {label(option)}
        </option>
      ))}
    </select>
  );
}
