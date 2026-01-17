"use client";

import { Icon } from "@/components/icons";
import type { Phase } from "../types";

export type CompletionDraft = {
  comment: string;
  artifactUrl: string;
  saving: boolean;
  error: string | null;
  pendingStatus?: string | null;
};

type PhaseCompletionPanelProps = {
  phase: Phase;
  draft: CompletionDraft;
  onDraftChange: (next: Partial<CompletionDraft>) => void;
  onFinish: () => Promise<void>;
  onCancel: () => void;
};

export function PhaseCompletionPanel({
  phase,
  draft,
  onDraftChange,
  onFinish,
  onCancel,
}: PhaseCompletionPanelProps) {
  if (draft.pendingStatus !== "DONE" || phase.status === "DONE") {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
        Complete phase
      </p>
      <div className="mt-2 grid gap-2">
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
          placeholder="Completion note (required)"
          value={draft.comment}
          onChange={(event) =>
            onDraftChange({
              comment: event.target.value,
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey) {
              event.preventDefault();
              void onFinish();
            }
          }}
        />
        <input
          className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
          placeholder="Artifact URL (optional)"
          value={draft.artifactUrl}
          onChange={(event) =>
            onDraftChange({
              artifactUrl: event.target.value,
            })
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
            type="button"
            disabled={draft.saving}
            onClick={() => void onFinish()}
          >
            <Icon name="check" size={12} />
            {draft.saving ? "Finishing…" : "Finish phase"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700"
            type="button"
            onClick={onCancel}
          >
            <Icon name="x" size={12} />
            Cancel
          </button>
        </div>
        {draft.error && <p className="text-xs text-rose-600">{draft.error}</p>}
      </div>
    </div>
  );
}
