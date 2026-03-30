import { NavLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getSummaries, getRoutes, getAssignments, getFlaggedEntries } from "../api/driverlogAPI";

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isTodayLocal(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const startToday = startOfTodayLocal();
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  return d >= startToday && d < startTomorrow;
}

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

function StatCard({ label, value, badge, icon = "📊" }) {
  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid #C7B788" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: "#C7B788" }}>{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-xl">{icon}</span>
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(159,204,129,0.15)", color: "#9FCC81", border: "1px solid rgba(159,204,129,0.3)" }}>
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 h-1 w-full rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-1 w-2/3 rounded-full" style={{ background: "#9FCC81", opacity: 0.5 }} />
      </div>
      <p className="mt-2 text-xs" style={{ color: "#C7B788" }}>Updated just now</p>
    </div>
  );
}

export default function Dashboard() {
  const [routes, setRoutes] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [routesStatus, setRoutesStatus] = useState("Loading routes...");
  const [routesError, setRoutesError] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsStatus, setAssignmentsStatus] = useState("Loading assignments...");
  const [assignmentsError, setAssignmentsError] = useState(null);
  const [summariesStatus, setSummariesStatus] = useState("Loading summaries...");
  const [summariesError, setSummariesError] = useState(null);

  // Flagged entries — same pattern as the other three cards
  const [flagged, setFlagged] = useState([]);
  const [flaggedStatus, setFlaggedStatus] = useState("Loading flagged...");
  const [flaggedError, setFlaggedError] = useState(null);

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
        if (data && Array.isArray(data.activeDrivers)) {
          setRoutes(data.activeDrivers.map((id) => ({ userId: id })));
          setRoutesStatus("Connected");
          return;
        }
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

    async function loadFlagged() {
      try {
        setFlaggedError(null);
        const data = await getFlaggedEntries();
        if (!alive) return;
        setFlagged(Array.isArray(data) ? data : []);
        setFlaggedStatus("Connected");
      } catch (error) {
        if (!alive) return;
        setFlagged([]);
        // If driver role gets a 403 that's expected — just show 0 silently
        setFlaggedStatus("Connected");
        setFlaggedError(null);
      }
    }

    loadSummaries();
    loadRoutes();
    loadAssignments();
    loadFlagged();

    const intervalId = setInterval(() => {
      loadSummaries();
      loadRoutes();
      loadAssignments();
      loadFlagged();
    }, 15000);

    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, []);

  const activeDriversCount = new Set(routes.map((r) => r.userId).filter(Boolean)).size;
  const reportsTodayCount = summaries.filter((s) => isTodayLocal(s.completedAt)).length;
  const openAssignmentsCount = assignments.filter((a) => String(a.status || "").toLowerCase() === "open").length;

  // Only count open (unresolved) flags
  const openFlaggedCount = flagged.filter((f) => f.status !== "Resolved").length;

  const cards = [
    {
      label: "Active Drivers",
      value: routesStatus === "Loading routes..." ? "—" : String(activeDriversCount),
      badge: routesStatus === "Connected" ? "Live" : routesStatus,
      icon: "🚚",
    },
    {
      label: "Open Assignments",
      value: assignmentsStatus === "Loading assignments..." ? "—" : String(openAssignmentsCount),
      badge: assignmentsStatus === "Connected" ? "Live" : assignmentsStatus,
      icon: "📦",
    },
    {
      label: "Reports Today",
      value: summariesStatus === "Loading summaries..." ? "—" : String(reportsTodayCount),
      badge: summariesStatus === "Connected" ? "Updated" : summariesStatus,
      icon: "🧾",
    },
    {
      label: "Flagged Entries",
      value: flaggedStatus === "Loading flagged..." ? "—" : String(openFlaggedCount),
      badge: flaggedStatus === "Connected" ? "Needs review" : flaggedStatus,
      icon: "🚩",
    },
  ];

  const activity = useMemo(() => {
    const assignmentItems = assignments.map((a) => ({
      type: "assignment", icon: "📦",
      text: `Assignment created: "${a.title || "Untitled"}"`,
      time: new Date(a.createdAt || a.updatedAt || Date.now()),
    }));
    const reportItems = summaries.map((s) => ({
      type: "report", icon: "🧾",
      text: `Report received: ${s.userName || s.userEmail || s.username || s.email || s.userId || "Driver"}`,
      time: new Date(s.completedAt || s.createdAt || Date.now()),
    }));
    return [...assignmentItems, ...reportItems]
      .filter((x) => x.time && !isNaN(x.time.getTime()))
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);
  }, [assignments, summaries]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a2a1b 0%, #1e2a2b 50%, #1a2020 100%)" }}>
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#9FCC81" }} />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#66AFB6" }} />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: "#C7B788" }} />
      </div>

      <div className="relative flex">
        <main className="flex-1">
          {/* Top bar */}
          <div style={{ borderBottom: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}>
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">Dashboard</h1>
                <p className="text-sm" style={{ color: "#C7B788" }}>Live Dashboard</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>
                  Export
                </button>
                <button className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "#66AFB6" }}>
                  + New Assignment
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
            {(summariesError || routesError || assignmentsError || flaggedError) && (
              <div className="rounded-2xl p-4" style={{ border: "1px solid rgba(199,100,100,0.3)", background: "rgba(199,100,100,0.1)" }}>
                <p className="text-sm font-semibold text-rose-200">Some data could not be loaded.</p>
                <div className="mt-2 space-y-1 text-sm text-rose-200/90">
                  {summariesError && <div>Summaries: {summariesError}</div>}
                  {routesError && <div>Routes: {routesError}</div>}
                  {assignmentsError && <div>Assignments: {assignmentsError}</div>}
                  {flaggedError && <div>Flagged: {flaggedError}</div>}
                </div>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((item) => (
                <StatCard key={item.label} label={item.label} value={item.value} badge={item.badge} icon={item.icon} />
              ))}
            </div>

            {/* Middle grid */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Operations Snapshot</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(102,175,182,0.15)", color: "#66AFB6", border: "1px solid rgba(102,175,182,0.3)" }}>
                      This Week
                    </span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "#C7B788" }}>
                    Quick overview of what's happening across drivers, assignments, and reports.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(199,183,136,0.15)" }}>
                      <p className="text-xs" style={{ color: "#C7B788" }}>Most urgent</p>
                      <p className="mt-1 font-semibold text-white">Review flagged entries</p>
                      <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>{cards[3].value} entries waiting for review.</p>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(199,183,136,0.15)" }}>
                      <p className="text-xs" style={{ color: "#C7B788" }}>Work not started</p>
                      <p className="mt-1 font-semibold text-white">Open assignments</p>
                      <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>{cards[1].value} assignments currently open.</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-3 text-sm text-white" style={{ background: "linear-gradient(90deg, #1a2a1b, #1e2a2b)", borderTop: "1px solid rgba(199,183,136,0.15)" }}>
                  Tip: Keep flagged notes low by stopping routes.
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl shadow-sm p-6" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                  <button className="text-sm font-semibold" style={{ color: "#9FCC81" }}>View all</button>
                </div>
                <ul className="mt-4 divide-y" style={{ borderColor: "rgba(199,183,136,0.15)" }}>
                  {activity.map((a, idx) => (
                    <li key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-base leading-none">{a.icon}</span>
                        <span className="text-sm text-white/85 break-words overflow-hidden line-clamp-2">{a.text}</span>
                      </div>
                      <span className="text-xs whitespace-nowrap" style={{ color: "#C7B788" }}>{formatTime(a.time)}</span>
                    </li>
                  ))}
                  {activity.length === 0 && (
                    <li className="py-6 text-sm" style={{ color: "#C7B788" }}>No recent activity yet.</li>
                  )}
                </ul>
                <div className="mt-5 rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(199,183,136,0.15)" }}>
                  <p className="text-xs" style={{ color: "#C7B788" }}>Next recommended action</p>
                  <p className="mt-1 font-semibold text-white">Check reports submitted today</p>
                  <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>{cards[2].value} reports received so far.</p>
                </div>
              </div>
            </div>

            {/* Reports Overview */}
            <div className="rounded-2xl shadow-sm p-6" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}>
              <h2 className="text-lg font-semibold text-white">Reports Overview</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Total reports today", value: cards[2].value },
                  { label: "Drivers active", value: cards[0].value },
                  { label: "Open flags", value: cards[3].value },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(199,183,136,0.15)" }}>
                    <p className="text-sm" style={{ color: "#C7B788" }}>{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}