export default function WorkPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          My Work
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Today’s queue
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            label: "Owned issues",
            items: ["ISS-1042 Payments rollback", "ISS-1032 SSO sync gap"],
          },
          {
            label: "Assigned phases",
            items: ["Rollout: ISS-1042", "QA: ISS-1039"],
          },
          {
            label: "Assigned tasks",
            items: ["Reproduce auth loop", "Patch validation script"],
          },
        ].map((lane) => (
          <div
            key={lane.label}
            className="rounded-2xl border border-slate-200/60 bg-white/90 p-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {lane.label}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {lane.items.map((item) => (
                <li key={item} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
