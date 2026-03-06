export default function Flagged() {
  const flaggedEntries = [
    {
      id: 1,
      driver: "Driver #19",
      reason: "Manual entry changed after submission",
      severity: "High",
      date: "Feb 3, 2026",
    },
    {
      id: 2,
      driver: "Driver #42",
      reason: "End-of-day report was not submitted",
      severity: "Medium",
      date: "Feb 4, 2026",
    },
    {
      id: 3,
      driver: "Driver #7",
      reason: "Reported mileage does not match expected route",
      severity: "Low",
      date: "Feb 4, 2026",
    },
  ];

  // Dark-theme severity pills (more colorful)
  const severityStyles = {
    High: "bg-rose-500/15 text-rose-200 ring-rose-300/20",
    Medium: "bg-amber-500/15 text-amber-200 ring-amber-300/20",
    Low: "bg-emerald-500/15 text-emerald-200 ring-emerald-300/20",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Page header */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Flagged Entries
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Review and resolve flagged driver logs.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/15 bg-white/10 text-white/80">
                  Total: {flaggedEntries.length}
                </span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/15 bg-white/10 text-white/80">
                  Prioritize: High severity
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 ring-1 ring-white/15">
                Export
              </button>
              <button className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95">
                Resolve Selected
              </button>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Queue</h2>
                <p className="text-sm text-white/60 mt-1">
                  Click “Review” to inspect details (placeholder).
                </p>
              </div>

              {/* quick legend */}
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ring-1 ${severityStyles.High}`}>
                  High
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ring-1 ${severityStyles.Medium}`}>
                  Medium
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ring-1 ${severityStyles.Low}`}>
                  Low
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/10 text-white/70">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-3 text-left font-semibold">Driver</th>
                  <th className="px-6 py-3 text-left font-semibold">Reason</th>
                  <th className="px-6 py-3 text-left font-semibold">Severity</th>
                  <th className="px-6 py-3 text-left font-semibold">Date</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {flaggedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white font-semibold">
                      {entry.driver}
                    </td>

                    <td className="px-6 py-4 text-white/80">
                      {entry.reason}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          severityStyles[entry.severity]
                        }`}
                      >
                        {entry.severity}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-white/60">{entry.date}</td>

                    <td className="px-6 py-4 text-right">
                      <button className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 ring-1 ring-white/15">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}

                {flaggedEntries.length === 0 && (
                  <tr>
                    <td className="px-6 py-10 text-white/60" colSpan={5}>
                      No flagged entries 🎉
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-white/60">
              Tip: Review <span className="font-semibold text-white/80">High</span> severity entries before exporting.
            </p>
            <button className="text-xs font-semibold text-white/80 hover:text-white">
              View history →
            </button>
          </div>
        </div>

        {/* Extra info card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-sm">
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white">Next step:</span> when backend is ready, this page can support:
            “Assign reviewer”, “Mark resolved”, and “Attach notes”.
          </p>
        </div>
      </div>
    </div>
  );
}