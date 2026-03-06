import { useEffect, useMemo, useState } from "react";
import {
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  getMe,
} from "../api/driverlogAPI";

//show driver email if available, else fallback to id
function driverLabel(a) {
  return a.driverEmail || a.driverId || "Unknown driver";
}


function prettyDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

/**
 * Generate a stable numeric hash from a string (email/id),
 * so the same driver always gets the same color.
 */
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
    {
      ring: "ring-sky-300/20",
      bg: "bg-sky-500/15",
      text: "text-sky-100",
      dot: "bg-sky-400",
    },
    {
      ring: "ring-emerald-300/20",
      bg: "bg-emerald-500/15",
      text: "text-emerald-100",
      dot: "bg-emerald-400",
    },
    {
      ring: "ring-violet-300/20",
      bg: "bg-violet-500/15",
      text: "text-violet-100",
      dot: "bg-violet-400",
    },
    {
      ring: "ring-amber-300/20",
      bg: "bg-amber-500/15",
      text: "text-amber-100",
      dot: "bg-amber-400",
    },
    {
      ring: "ring-rose-300/20",
      bg: "bg-rose-500/15",
      text: "text-rose-100",
      dot: "bg-rose-400",
    },
    {
      ring: "ring-cyan-300/20",
      bg: "bg-cyan-500/15",
      text: "text-cyan-100",
      dot: "bg-cyan-400",
    },
    {
      ring: "ring-fuchsia-300/20",
      bg: "bg-fuchsia-500/15",
      text: "text-fuchsia-100",
      dot: "bg-fuchsia-400",
    },
    {
      ring: "ring-lime-300/20",
      bg: "bg-lime-500/15",
      text: "text-lime-100",
      dot: "bg-lime-400",
    },
  ];

  const idx = hashString(driverKey) % themes.length;
  return themes[idx];
}

function DriverBadge({ value }) {
  const v = String(value || "");
  const theme = driverColorTheme(v);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* colored dot */}
      <span
        className={`h-2.5 w-2.5 rounded-full ${theme.dot} shrink-0`}
        title={v}
      />
      {/* pill */}
      <span
        className={[
          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
          theme.bg,
          theme.text,
          theme.ring,
          "min-w-0",
        ].join(" ")}
        title={v}
      >
        {/* prevent long emails from blowing up the table */}
        <span className="truncate max-w-[260px] sm:max-w-[320px] md:max-w-[360px]">
          {v || "Unknown driver"}
        </span>
      </span>
    </div>
  );
}

export default function Assignments() {
 
  const [me, setMe] = useState(null); // { userId, email, role, ... }
  const [assignments, setAssignments] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState(null);

  // form state
  const [title, setTitle] = useState("");
  const [driverId, setDriverId] = useState(""); // can be driverId OR email now
  const [driverEmail, setDriverEmail] = useState(""); // optional (still allowed)
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

  useEffect(() => {
    loadAll();
  }, []);

  
  const role = me?.role || null;

  // Only Admin/Manager can create assignments
  const isCreator = role === "Admin" || role === "Manager";

  // Only Drivers can update assignment status
  const canUpdateStatus = role === "Driver";

  const statusPill = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "open")
      return "bg-emerald-500/15 text-emerald-200 ring-emerald-300/20";
    if (s.includes("progress"))
      return "bg-amber-500/15 text-amber-200 ring-amber-300/20";
    if (s.includes("complete"))
      return "bg-sky-500/15 text-sky-200 ring-sky-300/20";
    return "bg-white/10 text-white/80 ring-white/15";
  };

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return db - da;
    });
  }, [assignments]);

  
  // CREATE ASSIGNMENT

  async function onCreate(e) {
    e.preventDefault();

    try {
      setError(null);

      if (!title.trim()) throw new Error("Title is required");
      if (!driverId.trim()) throw new Error("Driver ID or Email is required");

      await createAssignment({
        title: title.trim(),
        // accepts driverId OR email here
        driverId: driverId.trim(),
        driverEmail: driverEmail.trim(),
        priority,
        notes: notes.trim(),
      });

      // clear form
      setTitle("");
      setDriverId("");
      setDriverEmail("");
      setPriority("Normal");
      setNotes("");

      await loadAll();
    } catch (e2) {
      setError(e2?.message || "Failed to create assignment");
    }
  }

  function onClear() {
    setTitle("");
    setDriverId("");
    setDriverEmail("");
    setPriority("Normal");
    setNotes("");
  }

  
  // UPDATE STATUS (drivers only)

  async function setAssignmentStatus(a, newStatus) {
    try {
      setError(null);

      const updated = await updateAssignmentStatus({
        id: a.id,
        driverId: a.driverId,
        status: newStatus,
      });

      setAssignments((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
      );
    } catch (e) {
      setError(e?.message || "Failed to update status");
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Title */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Assignments
              </h1>
              <p className="mt-1 text-sm text-white/60">
                Send work to drivers and track status.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/15 bg-white/10 text-white/80">
                  Status: {status}
                </span>

                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/15 bg-white/10 text-white/80">
                  Count: {assignments.length}
                </span>

                {me?.email && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/15 bg-white/10 text-white/80">
                    {me.email}
                  </span>
                )}

                {role && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-white/15 bg-white/10 text-white/80">
                    Role: {role}
                  </span>
                )}
              </div>

              {error && (
                <p className="mt-3 text-sm text-rose-200 ring-1 ring-rose-300/20 bg-rose-500/10 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadAll}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 ring-1 ring-white/15"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Create Assignment (Admin/Manager ONLY) */}
        {isCreator && (
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Create Assignment
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Create an assignment for a driver (driver id or email is
                  required).
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-white/15 bg-white/10 text-white/80">
                Live
              </span>
            </div>

            <form
              onSubmit={onCreate}
              className="mt-5 grid md:grid-cols-3 gap-4"
            >
              {/* Title */}
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-white/70">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Deliver supplies"
                />
              </div>

              {/* Driver ID OR Email */}
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-white/70">
                  Driver ID or Email *
                </label>
                <input
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="driverUserId123 or driver1@domain.com"
                />
              </div>

              {/* Priority */}
              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-white/70">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  <option className="bg-slate-900">Normal</option>
                  <option className="bg-slate-900">High</option>
                </select>
              </div>

              {/* Notes */}
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-white/70">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Add directions, location, or important notes..."
                  rows={4}
                />
              </div>

              <div className="md:col-span-3 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 ring-1 ring-white/15"
                >
                  Clear
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Driver note */}
        {role === "Driver" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5">
            <p className="text-sm text-white/70">
              You’re signed in as a{" "}
              <span className="font-semibold text-white">Driver</span>. You can
              update your assignment status.
            </p>
          </div>
        )}

        {/* Assignments table */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-black/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Assignments</h2>
                <p className="text-sm text-white/60 mt-1">
                  Live Data
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-white/15 bg-white/10 text-white/80">
                Count: {sortedAssignments.length}
              </span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60 bg-black/10">
                <tr className="border-b border-white/10">
                  <th className="py-3 px-6 font-semibold">Title</th>
                  <th className="py-3 px-6 font-semibold">Driver</th>
                  <th className="py-3 px-6 font-semibold">Priority</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold text-right">Updated</th>

                  {/* Only drivers see the Action column */}
                  {canUpdateStatus && (
                    <th className="py-3 px-6 font-semibold text-right">
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {sortedAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5">
                    <td className="py-4 px-6 font-semibold text-white">
                      {a.title || "(no title)"}
                      {a.notes ? (
                        <div className="mt-1 text-xs text-white/50 line-clamp-1">
                          {a.notes}
                        </div>
                      ) : null}
                    </td>

                    {/* Colored driver badge */}
                    <td className="px-6 text-white/80">
                      <DriverBadge value={driverLabel(a)} />
                    </td>

                    <td className="px-6 text-white/80">
                      {a.priority || "Normal"}
                    </td>

                    <td className="px-6">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusPill(
                          a.status
                        )}`}
                      >
                        {a.status || "Open"}
                      </span>
                    </td>

                    <td className="px-6 text-right text-white/60">
                      {prettyDate(a.updatedAt || a.createdAt)}
                    </td>

                    {/* Only drivers see buttons */}
                    {canUpdateStatus ? (
                      <td className="px-6 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setAssignmentStatus(a, "In progress")}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 ring-1 ring-white/15"
                          >
                            In progress
                          </button>
                          <button
                            onClick={() => setAssignmentStatus(a, "Completed")}
                            className="rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                          >
                            Complete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}

                {sortedAssignments.length === 0 && (
                  <tr>
                    <td
                      className="px-6 py-10 text-white/60"
                      colSpan={canUpdateStatus ? 6 : 5}
                    >
                      No assignments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-white/10 bg-black/10 flex items-center justify-between">
            <p className="text-xs text-white/60">
              Next: Add filters (Open / In progress / Completed)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}