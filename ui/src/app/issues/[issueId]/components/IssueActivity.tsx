"use client";

import type { HistoryResponse } from "../types";
import { formatTimestamp } from "../detail-utils";

type IssueActivityProps = {
  history: HistoryResponse | null;
};

export function IssueActivity({ history }: IssueActivityProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
      {history?.activity?.length ? (
        history.activity.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{entry.type}</span>
              <span>{formatTimestamp(entry.occurredAt)}</span>
            </div>
            <p className="mt-2 font-semibold">{entry.summary}</p>
            {entry.actorId && (
              <p className="text-xs text-slate-500">Actor: {entry.actorId}</p>
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-500">No activity yet.</p>
      )}
    </section>
  );
}
