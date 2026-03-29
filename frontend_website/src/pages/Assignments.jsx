import { useEffect, useMemo, useState } from "react";
import { getAssignments, createAssignment, updateAssignmentStatus, getMe } from "../api/driverlogAPI";

function driverLabel(a) {
  return a.driverEmail || a.driverId || "Unknown driver";
}

function prettyDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function hashString(str) {
  const s = String(str || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function driverColorTheme(driverKey) {
  const themes = [
    { ring: "ring-sky-300/20", bg: "bg-sky-500/15", text: "text-sky-100", dot: "bg-sky-400" },
    { ring: "ring-emerald-300/20", bg: "bg-emerald-500/15", text: "text-emerald-100", dot: "bg-emerald-400" },
    { ring: "ring-violet-300/20", bg: "bg-violet-500/15", text: "text-violet-100", dot: "bg-violet-400" },
    { ring: "ring-amber-300/20", bg: "bg-amber-500/15", text: "text-amber-100", dot: "bg-amber-400" },
    { ring: "ring-rose-300/20", bg: "bg-rose-500/15", text: "text-rose-100", dot: "bg-rose-400" },
    { ring: "ring-cyan-300/20", bg: "bg-cyan-500/15", text: "text-cyan-100", dot: "bg-cyan-400" },
    { ring: "ring-fuchsia-300/20", bg: "bg-fuchsia-500/15", text: "text-fuchsia-100", dot: "bg-fuchsia-400" },
    { ring: "ring-lime-300/20", bg: "bg-lime-500/15", text: "text-lime-100", dot: "bg-lime-400" },
  ];
  return themes[hashString(driverKey) % themes.length];
}

function DriverBadge({ value }) {
  const v = String(value || "");
  const theme = driverColorTheme(v);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`h-2.5 w-2.5 rounded-full ${theme.dot} shrink-0`} title={v} />
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${theme.bg} ${theme.text} ${theme.ring} min-w-0`} title={v}>
        <span className="truncate max-w-[260px] sm:max-w-[320px] md:max-w-[360px]">{v || "Unknown driver"}</span>
      </span>
    </div>
  );
}

export default function Assignments() {
  const [me, setMe] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [driverId, setDriverId] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [notes, setNotes] = useState("");

  async function loadAll() {
    try {
      setError(null);
      setStatus("Loading...");
      const m = await getMe();
      setMe(m);
      const data = await getAssignments();
      setAssignments(Array.isArray(data) ? data : []);
      setStatus("Connected");
    } catch (e) {
      setStatus("Not connected");
      setError(e?.message || "Failed to load");
      setAssignments([]);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const role = me?.role || null;
  const isCreator = role === "Admin" || role === "Manager";
  const canUpdateStatus = role === "Driver";

  const statusPill = (s) => {
    const v = (s || "").toLowerCase();
    if (v === "open") return "bg-emerald-500/15 text-emerald-200 ring-emerald-300/20";
    if (v.includes("progress")) return "bg-amber-500/15 text-amber-200 ring-amber-300/20";
    if (v.includes("complete")) return "bg-sky-500/15 text-sky-200 ring-sky-300/20";
    return "bg-white/10 text-white/80 ring-white/15";
  };

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return db - da;
    });
  }, [assignments]);

  async function onCreate(e) {
    e.preventDefault();
    try {
      setError(null);
      if (!title.trim()) throw new Error("Title is required");
      if (!driverId.trim()) throw new Error("Driver ID or Email is required");
      await createAssignment({ title: title.trim(), driverId: driverId.trim(), driverEmail: driverEmail.trim(), priority, notes: notes.trim() });
      setTitle(""); setDriverId(""); setDriverEmail(""); setPriority("Normal"); setNotes("");
      await loadAll();
    } catch (e2) {
      setError(e2?.message || "Failed to create assignment");
    }
  }

  function onClear() { setTitle(""); setDriverId(""); setDriverEmail(""); setPriority("Normal"); setNotes(""); }

  async function setAssignmentStatus(a, newStatus) {
    try {
      setError(null);
      const updated = await updateAssignmentStatus({ id: a.id, driverId: a.driverId, status: newStatus });
      setAssignments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(e?.message || "Failed to update status");
    }
  }

  const inputStyle = { background: "rgba(0,0,0,0.25)", border: "1px solid rgba(199,183,136,0.3)", color: "white" };
  const focusClass = "outline-none focus:ring-2";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a2a1b 0%, #1e2a2b 50%, #1a2020 100%)" }}>
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#9FCC81" }} />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#66AFB6" }} />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: "#C7B788" }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="rounded-3xl p-6 sm:p-8 shadow-sm" style={{ border: "1px solid rgba(199,183,136,0.25)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Assignments</h1>
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>Send work to drivers and track status.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[`Status: ${status}`, `Count: ${assignments.length}`, me?.email, role ? `Role: ${role}` : null].filter(Boolean).map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(199,183,136,0.12)", color: "#C7B788", border: "1px solid rgba(199,183,136,0.25)" }}>{t}</span>
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-rose-200 rounded-xl px-3 py-2" style={{ background: "rgba(200,60,60,0.1)", border: "1px solid rgba(200,60,60,0.2)" }}>{error}</p>}
            </div>
            <button onClick={loadAll} className="rounded-xl px-4 py-2 text-sm font-semibold text-white self-start" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Create Assignment */}
        {isCreator && (
          <div className="rounded-3xl p-6 shadow-sm" style={{ border: "1px solid rgba(199,183,136,0.25)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Create Assignment</h2>
                <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>Create an assignment for a driver (driver id or email is required).</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(159,204,129,0.15)", color: "#9FCC81", border: "1px solid rgba(159,204,129,0.3)" }}>Live</span>
            </div>

            <form onSubmit={onCreate} className="mt-5 grid md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-semibold" style={{ color: "#C7B788" }}>Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-2 w-full rounded-xl px-3 py-2 placeholder:text-white/30 ${focusClass}`} style={{ ...inputStyle, focusRingColor: "#66AFB6" }} placeholder="Deliver supplies" />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-semibold" style={{ color: "#C7B788" }}>Driver ID or Email *</label>
                <input value={driverId} onChange={(e) => setDriverId(e.target.value)} className={`mt-2 w-full rounded-xl px-3 py-2 placeholder:text-white/30 ${focusClass}`} style={inputStyle} placeholder="driverUserId123 or driver@domain.com" />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs font-semibold" style={{ color: "#C7B788" }}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`mt-2 w-full rounded-xl px-3 py-2 ${focusClass}`} style={inputStyle}>
                  <option style={{ background: "#1e2a2b" }}>Normal</option>
                  <option style={{ background: "#1e2a2b" }}>High</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-semibold" style={{ color: "#C7B788" }}>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-2 w-full rounded-xl px-3 py-2 placeholder:text-white/30 ${focusClass}`} style={inputStyle} placeholder="Add directions, location, or important notes..." rows={4} />
              </div>
              <div className="md:col-span-3 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button type="button" onClick={onClear} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>Clear</button>
                <button type="submit" className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "#66AFB6" }}>Save Assignment</button>
              </div>
            </form>
          </div>
        )}

        {role === "Driver" && (
          <div className="rounded-3xl p-5" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.04)" }}>
            <p className="text-sm" style={{ color: "#C7B788" }}>You're signed in as a <span className="font-semibold text-white">Driver</span>. You can update your assignment status.</p>
          </div>
        )}

        {/* Table */}
        <div className="rounded-3xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(8px)" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(199,183,136,0.15)", background: "rgba(0,0,0,0.1)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Assignments</h2>
              <p className="text-sm mt-1" style={{ color: "#C7B788" }}>Live Data</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(102,175,182,0.15)", color: "#66AFB6", border: "1px solid rgba(102,175,182,0.3)" }}>Count: {sortedAssignments.length}</span>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left" style={{ background: "rgba(0,0,0,0.1)", color: "#C7B788" }}>
                <tr style={{ borderBottom: "1px solid rgba(199,183,136,0.15)" }}>
                  <th className="py-3 px-6 font-semibold">Title</th>
                  <th className="py-3 px-6 font-semibold">Driver</th>
                  <th className="py-3 px-6 font-semibold">Priority</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold text-right">Updated</th>
                  {canUpdateStatus && <th className="py-3 px-6 font-semibold text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {sortedAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid rgba(199,183,136,0.08)" }}>
                    <td className="py-4 px-6 font-semibold text-white">
                      {a.title || "(no title)"}
                      {a.notes ? <div className="mt-1 text-xs line-clamp-1" style={{ color: "#C7B788" }}>{a.notes}</div> : null}
                    </td>
                    <td className="px-6"><DriverBadge value={driverLabel(a)} /></td>
                    <td className="px-6" style={{ color: "#C7B788" }}>{a.priority || "Normal"}</td>
                    <td className="px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusPill(a.status)}`}>{a.status || "Open"}</span>
                    </td>
                    <td className="px-6 text-right" style={{ color: "#C7B788" }}>{prettyDate(a.updatedAt || a.createdAt)}</td>
                    {canUpdateStatus ? (
                      <td className="px-6 text-right">
                        <div className="inline-flex gap-2">
                          <button onClick={() => setAssignmentStatus(a, "In progress")} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.25)" }}>In progress</button>
                          <button onClick={() => setAssignmentStatus(a, "Completed")} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: "#9FCC81", color: "#1a2a1b" }}>Complete</button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
                {sortedAssignments.length === 0 && (
                  <tr><td className="px-6 py-10" style={{ color: "#C7B788" }} colSpan={canUpdateStatus ? 6 : 5}>No assignments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(199,183,136,0.15)", background: "rgba(0,0,0,0.1)" }}>
            <p className="text-xs" style={{ color: "#C7B788" }}>Next: Add filters (Open / In progress / Completed)</p>
          </div>
        </div>
      </div>
    </div>
  );
}