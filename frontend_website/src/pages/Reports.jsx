import { useEffect, useMemo, useState } from "react";
import { getSummaries } from "../api/driverlogAPI";

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());
  return d >= start && d <= now;
}

function formatDuration(seconds = 0) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function startOfWeekSunday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeekSundayExclusive(date = new Date()) {
  const start = startOfWeekSunday(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function isInSundayToSaturdayWeek(dateStr) {
  const d = new Date(dateStr);
  const start = startOfWeekSunday(new Date());
  const end = endOfWeekSundayExclusive(new Date());
  return d >= start && d < end;
}

function hashString(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function userBadgeClass(userKey = "") {
  const variants = [
    "bg-sky-500/15 text-sky-100 ring-sky-300/30",
    "bg-emerald-500/15 text-emerald-100 ring-emerald-300/30",
    "bg-violet-500/15 text-violet-100 ring-violet-300/30",
    "bg-amber-500/15 text-amber-100 ring-amber-300/30",
    "bg-rose-500/15 text-rose-100 ring-rose-300/30",
    "bg-cyan-500/15 text-cyan-100 ring-cyan-300/30",
    "bg-lime-500/15 text-lime-100 ring-lime-300/30",
    "bg-fuchsia-500/15 text-fuchsia-100 ring-fuchsia-300/30",
  ];
  return variants[hashString(String(userKey)) % variants.length];
}

function avgSpeedMphValue(s) {
  const mph = Number(s?.averageSpeedMph);
  if (!Number.isNaN(mph) && mph > 0) return mph;
  return 0;
}

function formatMph(mph) {
  if (!mph || mph <= 0 || Number.isNaN(mph)) return "—";
  return `${mph.toFixed(1)} mph`;
}

export default function Reports() {
  const [summaries, setSummaries] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("milesToday");

  async function load() {
    try {
      setError(null);
      setStatus("Loading...");
      const data = await getSummaries();
      setSummaries(Array.isArray(data) ? data : []);
      setStatus("Connected");
      setLastUpdated(new Date());
    } catch (e) {
      setStatus("Not connected");
      setError(e.message);
      setSummaries([]);
    }
  }

  useEffect(() => { load(); }, []);

  const dailyReportsRaw = useMemo(() => {
    const map = new Map();
    for (const s of summaries) {
      const userId = s.userId || "Unknown";
      const displayName = s.username || s.userEmail || s.email || s.userId || "Unknown";
      if (!map.has(userId)) {
        map.set(userId, { userId, displayName, milesToday: 0, routesToday: 0, durationTodaySec: 0, speedTodaySum: 0, speedTodayCount: 0, avgSpeedTodayMph: 0, milesWeek: 0, routesWeek: 0, durationWeekSec: 0, totalMiles: 0, totalRoutes: 0, totalDurationSec: 0 });
      }
      const agg = map.get(userId);
      const miles = Number(s.totalDistanceMiles) || 0;
      const duration = Number(s.durationSeconds) || 0;
      agg.totalMiles += miles; agg.totalRoutes += 1; agg.totalDurationSec += duration;
      if (s.completedAt) {
        if (isToday(s.completedAt)) {
          agg.milesToday += miles; agg.routesToday += 1; agg.durationTodaySec += duration;
          const mph = avgSpeedMphValue(s);
          if (mph > 0) { agg.speedTodaySum += mph; agg.speedTodayCount += 1; }
        }
        if (isThisWeek(s.completedAt)) { agg.milesWeek += miles; agg.routesWeek += 1; agg.durationWeekSec += duration; }
      }
    }
    const arr = Array.from(map.values());
    for (const a of arr) {
      a.avgTodaySec = a.routesToday ? a.durationTodaySec / a.routesToday : 0;
      a.avgWeekSec = a.routesWeek ? a.durationWeekSec / a.routesWeek : 0;
      a.avgOverallSec = a.totalRoutes ? a.totalDurationSec / a.totalRoutes : 0;
      a.avgSpeedTodayMph = a.speedTodayCount ? a.speedTodaySum / a.speedTodayCount : 0;
    }
    return arr;
  }, [summaries]);

  const dailyReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = dailyReportsRaw.filter((d) => {
      if (!q) return true;
      return String(d.displayName || "").toLowerCase().includes(q) || String(d.userId || "").toLowerCase().includes(q);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return String(a.displayName).localeCompare(String(b.displayName));
      if (sortBy === "routesToday") return b.routesToday - a.routesToday;
      if (sortBy === "durationToday") return b.durationTodaySec - a.durationTodaySec;
      return b.milesToday - a.milesToday;
    });
  }, [dailyReportsRaw, search, sortBy]);

  const dailyTotals = useMemo(() => {
    let totalMiles = 0, totalRoutes = 0, totalDurationSec = 0;
    for (const d of dailyReportsRaw) { totalMiles += d.milesToday; totalRoutes += d.routesToday; totalDurationSec += d.durationTodaySec; }
    return { totalMiles, totalRoutes, totalDurationSec, avgRouteSec: totalRoutes ? totalDurationSec / totalRoutes : 0, driversWithRoutes: dailyReportsRaw.filter((d) => d.routesToday > 0).length };
  }, [dailyReportsRaw]);

  const weeklySummaries = useMemo(() => {
    const start = startOfWeekSunday(new Date());
    const end = endOfWeekSundayExclusive(new Date());
    const map = new Map();
    for (const s of summaries) {
      if (!s.completedAt || !isInSundayToSaturdayWeek(s.completedAt)) continue;
      const userId = s.userId || "Unknown";
      const displayName = s.username || s.userEmail || s.email || s.userId || "Unknown";
      if (!map.has(userId)) map.set(userId, { userId, displayName, weekMiles: 0, weekRoutes: 0, weekDurationSec: 0, avgWeekSec: 0 });
      const agg = map.get(userId);
      agg.weekMiles += Number(s.totalDistanceMiles) || 0;
      agg.weekRoutes += 1;
      agg.weekDurationSec += Number(s.durationSeconds) || 0;
    }
    const arr = Array.from(map.values());
    for (const a of arr) a.avgWeekSec = a.weekRoutes ? a.weekDurationSec / a.weekRoutes : 0;
    arr.sort((a, b) => b.weekMiles - a.weekMiles);
    return { weekStart: start, weekEnd: end, rows: arr };
  }, [summaries]);

  const recentRoutes = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return db - da;
    });
  }, [summaries]);

  const cardStyle = { border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" };
  const innerCard = { background: "rgba(0,0,0,0.2)", border: "1px solid rgba(199,183,136,0.12)" };
  const inputStyle = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.25)", color: "white" };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a2a1b 0%, #1e2a2b 50%, #1a2020 100%)" }}>
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#9FCC81" }} />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#66AFB6" }} />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: "#C7B788" }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="rounded-3xl p-6 sm:p-8" style={cardStyle}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Reports</h1>
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>Daily driver activity and weekly summaries.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: status === "Connected" ? "rgba(159,204,129,0.15)" : "rgba(199,183,136,0.12)", color: status === "Connected" ? "#9FCC81" : "#C7B788", border: `1px solid ${status === "Connected" ? "rgba(159,204,129,0.3)" : "rgba(199,183,136,0.25)"}` }}>
                  {status}
                </span>
                <span className="text-xs" style={{ color: "#C7B788" }}>Summaries: <span className="font-semibold text-white">{summaries.length}</span></span>
                {lastUpdated && <span className="text-xs" style={{ color: "#C7B788" }}>Updated: {lastUpdated.toLocaleTimeString()}</span>}
              </div>
              {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={load} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>Refresh</button>
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "#66AFB6" }}>Export</button>
              <button className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: "#9FCC81", color: "#1a2a1b" }}>Download CSV</button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { title: "Drivers with routes today", value: dailyTotals.driversWithRoutes, icon: "👥" },
              { title: "Total routes today", value: dailyTotals.totalRoutes, icon: "🧾" },
              { title: "Miles today", value: dailyTotals.totalMiles.toFixed(1), icon: "🛣️" },
              { title: "Time driving today", value: formatDuration(dailyTotals.totalDurationSec), icon: "⏱️" },
              { title: "Avg route time today", value: formatDuration(dailyTotals.avgRouteSec), icon: "📈" },
            ].map((k) => (
              <div key={k.title} className="rounded-2xl p-4 shadow-sm" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#C7B788" }}>{k.title}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{k.value}</p>
                    <p className="mt-1 text-xs" style={{ color: "#C7B788" }}>Today</p>
                  </div>
                  <div className="text-xl">{k.icon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Reports */}
        <div className="mt-6 rounded-3xl p-6 shadow-sm" style={cardStyle}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Daily Reports</h2>
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>One card per driver. Shows today's completed routes.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver email or id..." className="w-full sm:w-72 rounded-xl px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none" style={inputStyle} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                <option value="milesToday" style={{ background: "#1e2a2b" }}>Sort: Miles today</option>
                <option value="routesToday" style={{ background: "#1e2a2b" }}>Sort: Routes today</option>
                <option value="durationToday" style={{ background: "#1e2a2b" }}>Sort: Time today</option>
                <option value="name" style={{ background: "#1e2a2b" }}>Sort: Name</option>
              </select>
              <div className="text-sm" style={{ color: "#C7B788" }}>Drivers: <span className="font-semibold text-white">{dailyReports.length}</span></div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dailyReports.map((u, idx) => {
              const hasToday = u.routesToday > 0;
              const isTop = idx === 0 && hasToday;
              return (
                <div key={u.userId} className="rounded-2xl p-5 shadow-sm transition hover:-translate-y-px" style={{ border: "1px solid rgba(199,183,136,0.2)", background: hasToday ? "rgba(159,204,129,0.07)" : "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{u.displayName}</p>
                      <p className="text-xs truncate" style={{ color: "#C7B788" }}>ID: {u.userId}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {isTop && <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "#C7B788", color: "#1a2a1b" }}>⭐ Top Today</span>}
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: hasToday ? "rgba(159,204,129,0.15)" : "rgba(199,183,136,0.1)", color: hasToday ? "#9FCC81" : "#C7B788", border: `1px solid ${hasToday ? "rgba(159,204,129,0.3)" : "rgba(199,183,136,0.2)"}` }}>
                        Today: {u.routesToday}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { title: "Miles today", value: u.milesToday.toFixed(1), accent: "#66AFB6" },
                      { title: "Avg time", value: formatDuration(u.avgTodaySec), accent: "#9FCC81" },
                      { title: "Avg speed (today)", value: formatMph(u.avgSpeedTodayMph), accent: "#C7B788" },
                      { title: "Total routes (today)", value: u.routesToday, accent: "#9FCC81" },
                    ].map((m) => (
                      <div key={m.title} className="rounded-xl p-3" style={innerCard}>
                        <p className="text-xs font-semibold" style={{ color: "#C7B788" }}>{m.title}</p>
                        <div className="mt-1 flex items-end justify-between gap-2">
                          <p className="text-lg font-bold text-white">{m.value}</p>
                          <span className="h-2 w-10 rounded-full" style={{ background: m.accent, opacity: 0.6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "#C7B788" }}>
                    <span>Avg overall: {formatDuration(u.avgOverallSec)}</span>
                    <span className={hasToday ? "font-semibold text-white" : ""}>{hasToday ? "Reported today" : "No routes today"}</span>
                  </div>
                </div>
              );
            })}
            {dailyReports.length === 0 && <div className="text-sm" style={{ color: "#C7B788" }}>No driver data yet (no completed routes).</div>}
          </div>
        </div>

        {/* Weekly Summaries */}
        <div className="mt-6 rounded-3xl p-6 shadow-sm" style={cardStyle}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Weekly Summaries (Sun → Sat)</h2>
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>
                Week range: <span className="font-semibold text-white">{weeklySummaries.weekStart.toLocaleDateString()}</span> to <span className="font-semibold text-white">{new Date(weeklySummaries.weekEnd.getTime() - 1).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="text-sm" style={{ color: "#C7B788" }}>Drivers: <span className="font-semibold text-white">{weeklySummaries.rows.length}</span></div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weeklySummaries.rows.map((u) => (
              <div key={u.userId} className="rounded-2xl p-5 ring-1 shadow-sm transition hover:-translate-y-px" style={{ border: "1px solid rgba(102,175,182,0.2)", background: "rgba(102,175,182,0.05)" }}>
                <p className="font-semibold text-white truncate">{u.displayName}</p>
                <p className="text-xs truncate" style={{ color: "#C7B788" }}>ID: {u.userId}</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[{ title: "Miles", value: u.weekMiles.toFixed(1) }, { title: "Routes", value: u.weekRoutes }, { title: "Avg", value: formatDuration(u.avgWeekSec) }].map((m) => (
                    <div key={m.title} className="rounded-xl p-3" style={innerCard}>
                      <p className="text-xs font-semibold" style={{ color: "#C7B788" }}>{m.title}</p>
                      <p className="mt-1 text-base font-bold text-white">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {weeklySummaries.rows.length === 0 && <div className="text-sm" style={{ color: "#C7B788" }}>No weekly routes yet for this Sunday → Saturday range.</div>}
          </div>
        </div>

        {/* Recent Routes */}
        <div className="mt-6 rounded-3xl shadow-sm overflow-hidden" style={cardStyle}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(199,183,136,0.15)", background: "rgba(255,255,255,0.03)" }}>
            <h3 className="font-bold text-white">Recent Routes</h3>
            <p className="text-sm mt-1" style={{ color: "#C7B788" }}>Most recent completed route summaries (top 20).</p>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead style={{ background: "rgba(0,0,0,0.15)", color: "#C7B788" }}>
                <tr style={{ borderBottom: "1px solid rgba(199,183,136,0.12)" }}>
                  {["User", "Completed", "Miles", "Duration", "Avg Speed"].map((h, i) => (
                    <th key={h} className={`px-6 py-3 font-semibold ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRoutes.slice(0, 20).map((s) => {
                  const userLabel = s.username || s.userEmail || s.email || s.userId || "Unknown";
                  return (
                    <tr key={s.id} className="hover:bg-white/5" style={{ borderBottom: "1px solid rgba(199,183,136,0.07)" }}>
                      <td className="px-6 py-3 min-w-0">
                        <span className={`inline-flex items-center max-w-[28rem] rounded-full px-3 py-1 text-xs font-semibold ring-1 ${userBadgeClass(userLabel)}`} title={String(userLabel)}>
                          <span className="truncate">{userLabel}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap" style={{ color: "#C7B788" }}>{s.completedAt ? new Date(s.completedAt).toLocaleString() : "-"}</td>
                      <td className="px-6 py-3 text-right font-semibold text-white whitespace-nowrap">{Number(s.totalDistanceMiles || 0).toFixed(1)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap" style={{ color: "#C7B788" }}>{formatDuration(s.durationSeconds || 0)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap" style={{ color: "#C7B788" }}>{formatMph(avgSpeedMphValue(s))}</td>
                    </tr>
                  );
                })}
                {recentRoutes.length === 0 && (
                  <tr><td className="px-6 py-6" style={{ color: "#C7B788" }} colSpan={5}>No route summaries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}