export default function IssuesPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Issues
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            All issues
          </h1>
        </div>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white">
          New issue
        </button>
      </header>

      <div className="grid gap-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Owner"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Assignee"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Phase kind"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Status"
          />
          <input
            className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-700"
            placeholder="Project"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
        {[
          {
            id: "ISS-1042",
            title: "Payments rollback post-migration",
            owner: "A. Lovelace",
            status: "IN_TEST",
            phases: 4,
          },
          {
            id: "ISS-1039",
            title: "Incident: auth refresh loop",
            owner: "G. Hopper",
            status: "IN_DEVELOPMENT",
            phases: 3,
          },
        ].map((issue) => (
          <div
            key={issue.id}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3"
          >
            <div>
              <p className="text-xs text-slate-500">{issue.id}</p>
              <p className="text-sm font-semibold text-slate-900">
                {issue.title}
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <span>{issue.owner}</span>
              <span>{issue.status}</span>
              <span>{issue.phases} phases</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
