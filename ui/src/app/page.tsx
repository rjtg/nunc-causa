import { Icon } from "@/components/icons";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/60 bg-white/90 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Control Room
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          Keep investigations moving without losing context.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Causa organizes complex issues into phases, assigns clear ownership,
          and makes the next allowed actions visible to everyone involved.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 font-medium text-white">
            <Icon name="plus" size={12} />
            New issue
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 font-medium text-slate-700">
            <Icon name="comment" size={12} />
            View my work
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "Active issues", value: "14", note: "3 blocked" },
          { label: "Phases in progress", value: "8", note: "2 awaiting QA" },
          { label: "Rollouts queued", value: "3", note: "1 needs approval" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/60 bg-white/90 p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
