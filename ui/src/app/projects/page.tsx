export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Projects
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Project portfolio
        </h1>
      </header>

      <div className="grid gap-4 rounded-2xl border border-slate-200/60 bg-white/90 p-4">
        {[
          { name: "Alpha", issues: 12, owner: "Platform" },
          { name: "Beacon", issues: 7, owner: "Reliability" },
        ].map((project) => (
          <div
            key={project.name}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <span className="font-semibold text-slate-900">{project.name}</span>
            <span>{project.issues} issues</span>
            <span>{project.owner}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
