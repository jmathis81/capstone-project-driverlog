import { NavLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getSummaries, getRoutes, getAssignments } from "../api/driverlogAPI";

// Start of today in local time 
function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Checks if a date string is today (local)
function isTodayLocal(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const startToday = startOfTodayLocal();
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  return d >= startToday && d < startTomorrow;
}

// Format "Just now / 5 min ago / 2 hr ago / 3/4/2026"
function formatTime(date) {
  if (!date || isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMins = Math.floor((now - date) / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr ago`;

  return date.toLocaleDateString();
}


function StatCard({ label, value, badge, badgeTone = "sky", icon = "📊" }) {
  const tones = {
    sky: "from-sky-500/25 to-white/5 ring-sky-300/30",
    emerald: "from-emerald-500/25 to-white/5 ring-emerald-300/30",
    violet: "from-violet-500/25 to-white/5 ring-violet-300/30",
    rose: "from-rose-500/25 to-white/5 ring-rose-300/30",
    amber: "from-amber-500/25 to-white/5 ring-amber-300/30",
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${
        tones[badgeTone] || tones.sky
      } p-5 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-xl">{icon}</span>
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-white/15 bg-white/10 text-white/80">
              {badge}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 h-1 w-full rounded-full bg-white/10">
        <div className="h-1 w-2/3 rounded-full bg-white/25" />
      </div>

      <p className="mt-2 text-xs text-white/60">Updated just now</p>
    </div>
  );
}

export default function Dashboard() {
  // State for routes (used to compute Active Drivers)
  const [routes, setRoutes] = useState([]);

  // stores the data coming from the backend
  const [summaries, setSummaries] = useState([]);

  // track routes loading status
  const [routesStatus, setRoutesStatus] = useState("Loading routes...");
  const [routesError, setRoutesError] = useState(null);

  // Assignments state (for Open Assignments card + activity)
  const [assignments, setAssignments] = useState([]);
  const [assignmentsStatus, setAssignmentsStatus] = useState(
    "Loading assignments..."
  );
  const [assignmentsError, setAssignmentsError] = useState(null);

  // summaries loading status
  const [summariesStatus, setSummariesStatus] = useState("Loading summaries...");
  const [summariesError, setSummariesError] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadSummaries() {
      try {
        setSummariesError(null);
        const data = await getSummaries();
        if (!alive) return;
        setSummaries(Array.isArray(data) ? data : []);
        setSummariesStatus("Connected");
      } catch (error) {
        if (!alive) return;
        setSummariesStatus("Not connected");
        setSummariesError(error.message);
        setSummaries([]);
      }
    }

    async function loadRoutes() {
      try {
        setRoutesError(null);
        const data = await getRoutes();
        if (!alive) return;

        // if backend returns { activeDrivers: [...] }
        if (data && Array.isArray(data.activeDrivers)) {
          setRoutes(data.activeDrivers.map((id) => ({ userId: id })));
          setRoutesStatus("Connected");
          return;
        }

        // fallback if backend ever returns an array
        setRoutes(Array.isArray(data) ? data : []);
        setRoutesStatus("Connected");
      } catch (error) {
        if (!alive) return;
        setRoutes([]);
        setRoutesStatus("Not connected");
        setRoutesError(error.message);
      }
    }

    async function loadAssignments() {
      try {
        setAssignmentsError(null);
        const data = await getAssignments();
        if (!alive) return;

        setAssignments(Array.isArray(data) ? data : []);
        setAssignmentsStatus("Connected");
      } catch (error) {
        if (!alive) return;
        setAssignments([]);
        setAssignmentsStatus("Not connected");
        setAssignmentsError(error.message);
      }
    }

    loadSummaries();
    loadRoutes();
    loadAssignments();

    const intervalId = setInterval(() => {
      loadSummaries();
      loadRoutes();
      loadAssignments();
    }, 15000);

    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, []);

  // Active Drivers count
  const activeDriversCount = new Set(
    routes.map((r) => r.userId).filter(Boolean)
  ).size;

  // Reports Today = summaries completed today
  const reportsTodayCount = summaries.filter((s) =>
    isTodayLocal(s.completedAt)
  ).length;

  // Open assignments count (case-insensitive)
  const openAssignmentsCount = assignments.filter(
    (a) => String(a.status || "").toLowerCase() === "open"
  ).length;

  const cards = [
    {
      label: "Active Drivers",
      value:
        routesStatus === "Loading routes..." ? "—" : String(activeDriversCount),
      badge: routesStatus === "Connected" ? "Live" : routesStatus,
      tone: "emerald",
      icon: "🚚",
    },
    {
      label: "Open Assignments",
      value:
        assignmentsStatus === "Loading assignments..."
          ? "—"
          : String(openAssignmentsCount),
      badge: assignmentsStatus === "Connected" ? "Live" : assignmentsStatus,
      tone: "violet",
      icon: "📦",
    },
    {
      label: "Reports Today",
      value:
        summariesStatus === "Loading summaries..."
          ? "—"
          : String(reportsTodayCount),
      badge: summariesStatus === "Connected" ? "Updated" : summariesStatus,
      tone: "sky",
      icon: "🧾",
    },
    {
      label: "Flagged Entries",
      value: "2",
      badge: "Needs review",
      tone: "rose",
      icon: "🚩",
    },
  ];

  // Recent Activity = combined assignments + reports (sorted newest first)
  const activity = useMemo(() => {
    const assignmentItems = assignments.map((a) => ({
      type: "assignment",
      icon: "📦",
      text: `Assignment created: "${a.title || "Untitled"}"`,
      time: new Date(a.createdAt || a.updatedAt || Date.now()),
    }));

    const reportItems = summaries.map((s) => ({
      type: "report",
      icon: "🧾",
      text: `Report received: ${
        s.userName ||
        s.userEmail ||
        s.username ||
        s.email ||
        s.userId ||
        "Driver"
      }`,
      time: new Date(s.completedAt || s.createdAt || Date.now()),
    }));

    return [...assignmentItems, ...reportItems]
      .filter((x) => x.time && !isNaN(x.time.getTime()))
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);
  }, [assignments, summaries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
      </div>

      <div className="relative flex">

        {/* Main content */}
        <main className="flex-1">
          {/* Top bar */}
          <div className="border-b border-white/10 bg-white/5 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-white/60">
                  Live Dashboard
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 ring-1 ring-white/15">
                  Export
                </button>
                <button className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-95">
                  + New Assignment
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
            
            {(summariesError || routesError || assignmentsError) && (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4">
                <p className="text-sm font-semibold text-rose-200">
                  Some data could not be loaded.
                </p>
                <div className="mt-2 space-y-1 text-sm text-rose-200/90">
                  {summariesError && <div>Summaries: {summariesError}</div>}
                  {routesError && <div>Routes: {routesError}</div>}
                  {assignmentsError && <div>Assignments: {assignmentsError}</div>}
                </div>
              </div>
            )}

            {/* Stat cards row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((item) => (
                <StatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  badge={item.badge}
                  badgeTone={item.tone}
                  icon={item.icon}
                />
              ))}
            </div>

            {/* Middle grid: big panel + activity */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Big panel card */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                      Operations Snapshot
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-white/15 bg-white/10 text-white/80">
                      This Week
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/70">
                    Quick overview of what’s happening across drivers,
                    assignments, and reports.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                      <p className="text-xs text-white/60">Most urgent</p>
                      <p className="mt-1 font-semibold text-white">
                        Review flagged entries
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        {cards[3].value} entries waiting for review.
                      </p>
                    </div>

                    <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                      <p className="text-xs text-white/60">Work not started</p>
                      <p className="mt-1 font-semibold text-white">
                        Open assignments
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        {cards[1].value} assignments currently open.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-950 to-indigo-950 text-white px-6 py-3 text-sm border-t border-white/10">
                  Tip: Keep flagged notes low by stopping routes.
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Recent Activity
                  </h2>
                  <button className="text-sm font-semibold text-white/80 hover:text-white">
                    View all
                  </button>
                </div>

                <ul className="mt-4 divide-y divide-white/10">
                  {activity.map((a, idx) => (
                    <li
                      key={idx}
                      className="py-3 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-base leading-none">{a.icon}</span>
                        <span className="text-sm text-white/85 break-words overflow-hidden line-clamp-2">
                          {a.text}
                        </span>
                      </div>

                      <span className="text-xs text-white/60 whitespace-nowrap">
                        {formatTime(a.time)}
                      </span>
                    </li>
                  ))}

                  {activity.length === 0 && (
                    <li className="py-6 text-sm text-white/60">
                      No recent activity yet.
                    </li>
                  )}
                </ul>

                <div className="mt-5 rounded-xl bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-white/60">
                    Next recommended action
                  </p>
                  <p className="mt-1 font-semibold text-white">
                    Check reports submitted today
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {cards[2].value} reports received so far.
                  </p>
                </div>
              </div>
            </div>

            {/* Reports Overview */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Reports Overview
                </h2>
                
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <p className="text-sm text-white/60">Total reports today</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {cards[2].value}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <p className="text-sm text-white/60">Drivers active</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {cards[0].value}
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 border border-white/10 p-4">
                  <p className="text-sm text-white/60">Flags</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {cards[3].value}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}