"use client";

import { useHealth } from "@/lib/health/context";
import { Icon } from "@/components/icons";
import { Tooltip } from "@/components/tooltip";

export default function HealthBanner() {
  const { online, lastCheckedAt, checkNow } = useHealth();
  if (online) {
    return null;
  }
  return (
    <div className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-xs text-rose-700">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <Icon name="x" size={12} />
          Backend offline. Changes will retry when the API is back.
        </span>
        <Tooltip content={lastCheckedAt ?? undefined}>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700"
            type="button"
            onClick={checkNow}
          >
            <Icon name="reset" size={12} />
            Retry
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
