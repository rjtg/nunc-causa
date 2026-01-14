export default function AdminPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Org setup
        </h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { title: "Organizations", note: "Manage orgs and owners" },
          { title: "Teams", note: "Define team hierarchy" },
          { title: "Projects", note: "Create projects per team" },
          { title: "Memberships", note: "Invite users and grant roles" },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200/60 bg-white/90 p-4"
          >
            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
            <p className="mt-2 text-xs text-slate-600">{card.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
