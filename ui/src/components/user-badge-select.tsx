"use client";

import { useEffect, useMemo, useState } from "react";
import { Typeahead } from "@/components/typeahead";
import { Tooltip } from "@/components/tooltip";
import { Icon } from "@/components/icons";

type UserOption = {
  id: string;
  displayName: string;
  openIssueCount?: number;
  openPhaseCount?: number;
  openTaskCount?: number;
};

type UserBadgeSelectProps = {
  value?: string | null;
  users: UserOption[];
  label: string;
  ariaLabel: string;
  placeholder?: string;
  saveOnSelect?: boolean;
  onSave: (nextId: string | null) => Promise<void> | void;
  onRequestUsers?: () => void;
};

export function UserBadgeSelect({
  value,
  users,
  label,
  ariaLabel,
  placeholder,
  saveOnSelect = true,
  onSave,
  onRequestUsers,
}: UserBadgeSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setDraft(value ?? "");
      setError(null);
    }
  }, [open, value]);

  const selected = users.find((user) => user.id === value);
  const displayLabel = selected?.displayName ?? (value ? value : "Unassigned");
  const workload = selected
    ? `${selected.openIssueCount ?? 0} / ${selected.openPhaseCount ?? 0} / ${
        selected.openTaskCount ?? 0
      }`
    : null;

  const options = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...users.map((user) => ({
        value: user.id,
        label: user.displayName,
        meta: `${user.openIssueCount ?? 0} / ${user.openPhaseCount ?? 0} / ${
          user.openTaskCount ?? 0
        }`,
      })),
    ],
    [users],
  );

  const submitDraft = async (nextValue?: string | null) => {
    setSaving(true);
    setError(null);
    const resolved = (nextValue ?? draft).trim();
    try {
      await onSave(resolved ? resolved : null);
      setOpen(false);
    } catch {
      setError(`Unable to update ${label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <Tooltip
        content={
          value
            ? `${displayLabel}${workload ? ` · ${workload}` : ""}`
            : "Unassigned"
        }
      >
        <button
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
            value
              ? "border-violet-200 bg-violet-100 text-violet-700"
              : "border-slate-200 bg-white text-slate-500"
          }`}
          type="button"
          aria-label={ariaLabel}
          onClick={() => {
            if (!open) {
              onRequestUsers?.();
            }
            setOpen((prev) => !prev);
          }}
        >
          <Icon name="user" size={12} />
          {displayLabel}
        </button>
      </Tooltip>
      {open && (
        <div className="absolute z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Typeahead
              value={draft}
              onChange={setDraft}
              onQueryChange={setDraft}
              onSelect={(next) => {
                setDraft(next);
                if (saveOnSelect) {
                  void submitDraft(next);
                }
              }}
              options={options}
              placeholder={placeholder ?? label}
              inputClassName="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              autoFocus
            />
            {!saveOnSelect && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  type="button"
                  onClick={() => setDraft("")}
                >
                  <Icon name="x" size={12} />
                  Clear
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={saving}
                  onClick={() => void submitDraft()}
                >
                  <Icon name="check" size={12} />
                  Save
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  <Icon name="x" size={12} />
                  Cancel
                </button>
              </div>
            )}
            {error && <span className="text-rose-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
