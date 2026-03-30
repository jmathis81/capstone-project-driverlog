import { useEffect, useState } from "react";
import { getFlaggedEntries, updateFlagStatus } from "../api/driverlogAPI";

export default function Flagged() {
  const [allEntries, setAllEntries] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [resolving, setResolving] = useState(false);

  async function loadFlaggedEntries() {
    try {
      setError(null);
      setStatus("Loading...");
      const data = await getFlaggedEntries();
      setAllEntries(Array.isArray(data) ? data : []);
      setStatus("Connected");
    } catch (e) {
      setStatus("Not connected");
      setError(e?.message || "Failed to load flagged entries");
      setAllEntries([]);
    }
  }

  useEffect(() => { loadFlaggedEntries(); }, []);

  const flaggedEntries = showHistory
    ? allEntries.filter((e) => e.status === "Resolved")
    : allEntries.filter((e) => e.status !== "Resolved");

  function handleExport() {
    if (flaggedEntries.length === 0) return;
    const headers = ["Driver", "Reason", "Severity", "Status", "Date", "Notes"];
    const rows = flaggedEntries.map((e) => [
      e.driverEmail || e.driverId || "Unknown",
      `"${(e.reason || "").replace(/"/g, '""')}"`,
      e.severity || "Medium",
      e.status || "Open",
      e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "-",
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flagged-entries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleResolve() {
    if (!selectedEntry) return;
    setResolving(true);
    try {
      await updateFlagStatus(selectedEntry.id, selectedEntry.driverId, "Resolved");
      setAllEntries((prev) => prev.map((e) => e.id === selectedEntry.id ? { ...e, status: "Resolved" } : e));
      setSelectedEntry(null);
    } catch (e) {
      alert("Failed to resolve: " + (e?.message || "Unknown error"));
    } finally {
      setResolving(false);
    }
  }

  const severityStyles = {
    High: { bg: "rgba(200,60,60,0.15)", color: "#f87171", border: "rgba(200,60,60,0.3)" },
    Medium: { bg: "rgba(199,183,136,0.15)", color: "#C7B788", border: "rgba(199,183,136,0.3)" },
    Low: { bg: "rgba(159,204,129,0.15)", color: "#9FCC81", border: "rgba(159,204,129,0.3)" },
  };

  function SeverityBadge({ severity }) {
    const s = severityStyles[severity] || severityStyles.Medium;
    return (
      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
        {severity || "Medium"}
      </span>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a2a1b 0%, #1e2a2b 50%, #1a2020 100%)" }}>
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#9FCC81" }} />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#66AFB6" }} />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: "#C7B788" }} />
      </div>

      {/* Review modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} onClick={() => setSelectedEntry(null)}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-xl space-y-4" style={{ background: "#1e2a2b", border: "1px solid rgba(199,183,136,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Flag Details</h2>
                <p className="text-sm mt-0.5" style={{ color: "#C7B788" }}>{selectedEntry.driverEmail || selectedEntry.driverId || "Unknown driver"}</p>
              </div>
              <SeverityBadge severity={selectedEntry.severity} />
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#C7B788" }}>Reason</p>
                <p className="text-white/90">{selectedEntry.reason}</p>
              </div>
              {selectedEntry.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#C7B788" }}>Notes</p>
                  <p style={{ color: "#C7B788" }}>{selectedEntry.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Source", value: selectedEntry.sourceType || "-" },
                  { label: "Date", value: selectedEntry.createdAt ? new Date(selectedEntry.createdAt).toLocaleDateString() : "-" },
                  { label: "Status", value: selectedEntry.status || "Open" },
                  selectedEntry.resolvedBy ? { label: "Resolved by", value: selectedEntry.resolvedBy } : null,
                ].filter(Boolean).map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#C7B788" }}>{item.label}</p>
                    <p style={{ color: "#e8e4d8" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setSelectedEntry(null)} className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>Close</button>
              {selectedEntry.status !== "Resolved" && (
                <button onClick={handleResolve} disabled={resolving} className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#9FCC81", color: "#1a2a1b" }}>
                  {resolving ? "Resolving..." : "Mark as Resolved"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl p-6 sm:p-8 shadow-sm" style={{ border: "1px solid rgba(199,183,136,0.25)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{showHistory ? "Resolved History" : "Flagged Entries"}</h1>
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>{showHistory ? "Previously resolved flagged entries." : "Review and resolve flagged driver logs."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[`Status: ${status}`, `Total: ${flaggedEntries.length}`, !showHistory ? "Prioritize: High severity" : null].filter(Boolean).map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(199,183,136,0.12)", color: "#C7B788", border: "1px solid rgba(199,183,136,0.25)" }}>{t}</span>
                ))}
              </div>
              {error && <p className="mt-3 text-sm rounded-xl px-3 py-2" style={{ color: "#f87171", background: "rgba(200,60,60,0.1)", border: "1px solid rgba(200,60,60,0.2)" }}>{error}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={loadFlaggedEntries} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>Refresh</button>
              <button onClick={handleExport} disabled={flaggedEntries.length === 0} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>Export</button>
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-3xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(199,183,136,0.15)", background: "rgba(0,0,0,0.1)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">{showHistory ? "Resolved entries" : "Queue"}</h2>
              <p className="text-sm mt-1" style={{ color: "#C7B788" }}>{showHistory ? "Entries that have been marked as resolved." : "Click Review to inspect details and resolve entries."}</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs">
              {Object.entries(severityStyles).map(([label, s]) => (
                <span key={label} className="inline-flex items-center rounded-full px-2.5 py-1 font-semibold" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{label}</span>
              ))}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(0,0,0,0.1)", color: "#C7B788" }}>
                <tr style={{ borderBottom: "1px solid rgba(199,183,136,0.12)" }}>
                  <th className="px-6 py-3 text-left font-semibold">Driver</th>
                  <th className="px-6 py-3 text-left font-semibold">Reason</th>
                  <th className="px-6 py-3 text-left font-semibold">Severity</th>
                  <th className="px-6 py-3 text-left font-semibold">Date</th>
                  <th className="px-6 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {flaggedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid rgba(199,183,136,0.08)" }}>
                    <td className="px-6 py-4 font-semibold text-white">{entry.driverEmail || entry.driverId || "Unknown driver"}</td>
                    <td className="px-6 py-4" style={{ color: "#e8e4d8" }}>{entry.reason}</td>
                    <td className="px-6 py-4"><SeverityBadge severity={entry.severity} /></td>
                    <td className="px-6 py-4" style={{ color: "#C7B788" }}>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setSelectedEntry(entry)} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "rgba(102,175,182,0.2)", border: "1px solid rgba(102,175,182,0.4)", color: "#66AFB6" }}>Review</button>
                    </td>
                  </tr>
                ))}
                {flaggedEntries.length === 0 && status !== "Loading..." && (
                  <tr><td className="px-6 py-10" style={{ color: "#C7B788" }} colSpan={5}>{showHistory ? "No resolved entries yet." : status === "Connected" ? "No flagged entries 🎉" : "Loading..."}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ borderTop: "1px solid rgba(199,183,136,0.12)", background: "rgba(0,0,0,0.1)" }}>
            <p className="text-xs" style={{ color: "#C7B788" }}>
              {showHistory ? "Showing resolved entries only." : <>Tip: Review <span className="font-semibold text-white">High</span> severity entries before exporting.</>}
            </p>
            <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-semibold" style={{ color: "#9FCC81" }}>
              {showHistory ? "← Back to queue" : "View history →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}