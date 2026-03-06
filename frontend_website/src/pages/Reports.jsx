import { useEffect, useMemo, useState } from "react";
import { getSummaries } from "../api/driverlogAPI";


function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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


// Stable hash so same user always gets same color)
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
  const idx = hashString(String(userKey)) % variants.length;
  return variants[idx];
}


function avgSpeedMphValue(s) {
  // use DB value
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

  // Search and Sort controls for Daily Reports
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("milesToday"); // milesToday | routesToday | durationToday | name

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

  useEffect(() => {
    load();
  }, []);

  /* Daily Reports (Per User)*/
  const dailyReportsRaw = useMemo(() => {
    const map = new Map();

    for (const s of summaries) {
      const userId = s.userId || "Unknown";
      const displayName = s.username || s.userEmail || s.email || s.userId || "Unknown";

      if (!map.has(userId)) {
        map.set(userId, {
          userId,
          displayName,

          milesToday: 0,
          routesToday: 0,
          durationTodaySec: 0,

          // avg speed today
          speedTodaySum: 0,
          speedTodayCount: 0,
          avgSpeedTodayMph: 0,

          milesWeek: 0,
          routesWeek: 0,
          durationWeekSec: 0,

          // overall totals 
          totalMiles: 0,
          totalRoutes: 0,
          totalDurationSec: 0,
        });
      }

      const agg = map.get(userId);
      const miles = Number(s.totalDistanceMiles) || 0;
      const duration = Number(s.durationSeconds) || 0;

      // overall totals
      agg.totalMiles += miles;
      agg.totalRoutes += 1;
      agg.totalDurationSec += duration;

      if (s.completedAt) {
        if (isToday(s.completedAt)) {
          agg.milesToday += miles;
          agg.routesToday += 1;
          agg.durationTodaySec += duration;

          
          const mph = avgSpeedMphValue(s);
          if (mph > 0) {
            agg.speedTodaySum += mph;
            agg.speedTodayCount += 1;
          }
        }

        if (isThisWeek(s.completedAt)) {
          agg.milesWeek += miles;
          agg.routesWeek += 1;
          agg.durationWeekSec += duration;
        }
      }
    }

    const arr = Array.from(map.values());

    for (const a of arr) {
      a.avgTodaySec = a.routesToday ? a.durationTodaySec / a.routesToday : 0;
      a.avgWeekSec = a.routesWeek ? a.durationWeekSec / a.routesWeek : 0;
      a.avgOverallSec = a.totalRoutes ? a.totalDurationSec / a.totalRoutes : 0;

      // avg speed today mph
      a.avgSpeedTodayMph = a.speedTodayCount
        ? a.speedTodaySum / a.speedTodayCount
        : 0;
    }

    return arr;
  }, [summaries]);

  // Filter and Sort daily reports
  const dailyReports = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = dailyReportsRaw.filter((d) => {
      if (!q) return true;
      const name = String(d.displayName || "").toLowerCase();
      const id = String(d.userId || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name")
        return String(a.displayName).localeCompare(String(b.displayName));
      if (sortBy === "routesToday") return b.routesToday - a.routesToday;
      if (sortBy === "durationToday") return b.durationTodaySec - a.durationTodaySec;
      // default: milesToday
      return b.milesToday - a.milesToday;
    });

    return sorted;
  }, [dailyReportsRaw, search, sortBy]);

  const dailyTotals = useMemo(() => {
    let totalMiles = 0;
    let totalRoutes = 0;
    let totalDurationSec = 0;

    for (const d of dailyReportsRaw) {
      totalMiles += d.milesToday;
      totalRoutes += d.routesToday;
      totalDurationSec += d.durationTodaySec;
    }

    return {
      totalMiles,
      totalRoutes,
      totalDurationSec,
      avgRouteSec: totalRoutes ? totalDurationSec / totalRoutes : 0,
      driversWithRoutes: dailyReportsRaw.filter((d) => d.routesToday > 0).length,
    };
  }, [dailyReportsRaw]);

  /* Weekly Summaries*/
  const weeklySummaries = useMemo(() => {
    const start = startOfWeekSunday(new Date());
    const end = endOfWeekSundayExclusive(new Date());

    const map = new Map();

    for (const s of summaries) {
      if (!s.completedAt) continue;
      if (!isInSundayToSaturdayWeek(s.completedAt)) continue;

      const userId = s.userId || "Unknown";
      const displayName = s.username || s.userEmail || s.email || s.userId || "Unknown";

      if (!map.has(userId)) {
        map.set(userId, {
          userId,
          displayName,
          weekMiles: 0,
          weekRoutes: 0,
          weekDurationSec: 0,
          avgWeekSec: 0,
        });
      }

      const agg = map.get(userId);
      const miles = Number(s.totalDistanceMiles) || 0;
      const duration = Number(s.durationSeconds) || 0;

      agg.weekMiles += miles;
      agg.weekRoutes += 1;
      agg.weekDurationSec += duration;
    }

    const arr = Array.from(map.values());
    for (const a of arr) {
      a.avgWeekSec = a.weekRoutes ? a.weekDurationSec / a.weekRoutes : 0;
    }

    arr.sort((a, b) => b.weekMiles - a.weekMiles);

    return { weekStart: start, weekEnd: end, rows: arr };
  }, [summaries]);

  /* Recent Routes (top newest) */
  const recentRoutes = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return db - da;
    });
  }, [summaries]);

  const connectionPill =
    status === "Connected"
      ? "bg-emerald-400/15 text-emerald-100 ring-emerald-300/30"
      : status === "Loading..."
      ? "bg-sky-400/15 text-sky-100 ring-sky-300/30"
      : "bg-rose-400/15 text-rose-100 ring-rose-300/30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8">
      
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Reports
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Daily driver activity and weekly summaries.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${connectionPill}`}
                >
                  {status}
                </span>

                <span className="text-xs text-white/70">
                  Summaries:{" "}
                  <span className="font-semibold text-white">
                    {summaries.length}
                  </span>
                </span>

                {lastUpdated && (
                  <span className="text-xs text-white/60">
                    Updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={load}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 ring-1 ring-white/15"
              >
                Refresh
              </button>
              <button className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95">
                Export
              </button>
              <button className="rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:opacity-95">
                Download CSV
              </button>
            </div>
          </div>

          
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              title="Drivers with routes today"
              value={dailyTotals.driversWithRoutes}
              subtitle="Today"
              gradient="from-sky-500/25 to-white/5"
              icon="👥"
            />
            <KpiCard
              title="Total routes today"
              value={dailyTotals.totalRoutes}
              subtitle="Today"
              gradient="from-emerald-500/25 to-white/5"
              icon="🧾"
            />
            <KpiCard
              title="Miles today"
              value={dailyTotals.totalMiles.toFixed(1)}
              subtitle="Today"
              gradient="from-violet-500/25 to-white/5"
              icon="🛣️"
            />
            <KpiCard
              title="Time driving today"
              value={formatDuration(dailyTotals.totalDurationSec)}
              subtitle="Today"
              gradient="from-amber-500/25 to-white/5"
              icon="⏱️"
            />
            <KpiCard
              title="Avg route time today"
              value={formatDuration(dailyTotals.avgRouteSec)}
              subtitle="Today"
              gradient="from-rose-500/25 to-white/5"
              icon="📈"
            />
          </div>
        </div>

        {/*DAILY REPORTS*/}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Daily Reports
              </h2>
              <p className="mt-1 text-sm text-white/70">
                One card per driver. Shows today’s completed routes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search driver email or id..."
                className="w-full sm:w-72 rounded-xl bg-white/10 text-white placeholder:text-white/50 px-3 py-2 text-sm ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              />

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl bg-white/10 text-white px-3 py-2 text-sm ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-violet-400/60"
              >
                <option value="milesToday">Sort: Miles today</option>
                <option value="routesToday">Sort: Routes today</option>
                <option value="durationToday">Sort: Time today</option>
                <option value="name">Sort: Name</option>
              </select>

              <div className="text-sm text-white/70">
                Drivers:{" "}
                <span className="font-semibold text-white">
                  {dailyReports.length}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dailyReports.map((u, idx) => {
              const hasToday = u.routesToday > 0;
              const isTop = idx === 0 && hasToday;

              return (
                <div
                  key={u.userId}
                  className={`rounded-2xl p-5 shadow-sm ring-1 transition hover:translate-y-[-1px] hover:shadow-md ${
                    hasToday
                      ? "bg-gradient-to-br from-white/10 to-sky-500/10 ring-white/15"
                      : "bg-white/5 ring-white/10 opacity-90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {u.displayName}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        ID: {u.userId}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isTop && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold bg-gradient-to-r from-amber-400 to-yellow-200 text-slate-950">
                          ⭐ Top Today
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                          hasToday
                            ? "bg-emerald-500/15 text-emerald-100 ring-emerald-300/30"
                            : "bg-white/10 text-white/70 ring-white/15"
                        }`}
                      >
                        Today: {u.routesToday}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat
                      title="Miles today"
                      value={u.milesToday.toFixed(1)}
                      accent="from-sky-400 to-indigo-400"
                    />
                    <MiniStat
                      title="Avg time"
                      value={formatDuration(u.avgTodaySec)}
                      accent="from-emerald-400 to-lime-400"
                    />

                    {/* Avg speed (today) */}
                    <MiniStat
                      title="Avg speed (today)"
                      value={formatMph(u.avgSpeedTodayMph)}
                      accent="from-violet-400 to-fuchsia-400"
                    />

                    {/* Total routes (today) */}
                    <MiniStat
                      title="Total routes (today)"
                      value={u.routesToday}
                      accent="from-amber-400 to-orange-400"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                    <span>Avg overall: {formatDuration(u.avgOverallSec)}</span>
                    <span
                      className={`font-semibold ${
                        hasToday ? "text-white" : "text-white/60"
                      }`}
                    >
                      {hasToday ? "Reported today" : "No routes today"}
                    </span>
                  </div>
                </div>
              );
            })}

            {dailyReports.length === 0 && (
              <div className="text-sm text-white/70">
                No driver data yet (no completed routes).
              </div>
            )}
          </div>
        </div>

        {/* WEEKLY SUMMARIES */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Weekly Summaries (Sun → Sat)
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Week range:{" "}
                <span className="font-semibold text-white">
                  {weeklySummaries.weekStart.toLocaleDateString()}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-white">
                  {new Date(
                    weeklySummaries.weekEnd.getTime() - 1
                  ).toLocaleDateString()}
                </span>
              </p>
            </div>

            <div className="text-sm text-white/70">
              Drivers:{" "}
              <span className="font-semibold text-white">
                {weeklySummaries.rows.length}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weeklySummaries.rows.map((u) => (
              <div
                key={u.userId}
                className="rounded-2xl bg-gradient-to-br from-white/10 to-violet-500/10 p-5 ring-1 ring-white/15 shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
              >
                <p className="font-semibold text-white truncate">{u.displayName}</p>
                <p className="text-xs text-white/60 truncate">ID: {u.userId}</p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <MiniStatSmall title="Miles" value={u.weekMiles.toFixed(1)} />
                  <MiniStatSmall title="Routes" value={u.weekRoutes} />
                  <MiniStatSmall title="Avg" value={formatDuration(u.avgWeekSec)} />
                </div>
              </div>
            ))}

            {weeklySummaries.rows.length === 0 && (
              <div className="text-sm text-white/70">
                No weekly routes yet for this Sunday → Saturday range.
              </div>
            )}
          </div>
        </div>

        {/* Recent Routes Table*/}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="font-bold text-white">Recent Routes</h3>
            <p className="text-sm text-white/70 mt-1">
              Most recent completed route summaries (top 20).
            </p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-950/70 backdrop-blur text-white/80">
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-3 font-semibold">User</th>
                  <th className="text-left px-6 py-3 font-semibold">Completed</th>
                  <th className="text-right px-6 py-3 font-semibold">Miles</th>
                  <th className="text-right px-6 py-3 font-semibold">Duration</th>
                  <th className="text-right px-6 py-3 font-semibold">Avg Speed</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {recentRoutes.slice(0, 20).map((s) => {
                  const userLabel =
                    s.username || s.userEmail || s.email || s.userId || "Unknown";
                  const mph = avgSpeedMphValue(s);

                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="px-6 py-3 min-w-0">
                        <span
                          className={`inline-flex items-center max-w-[28rem] rounded-full px-3 py-1 text-xs font-semibold ring-1 ${userBadgeClass(
                            userLabel
                          )}`}
                          title={String(userLabel)}
                        >
                          <span className="truncate">{userLabel}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3 text-white/80 whitespace-nowrap">
                        {s.completedAt
                          ? new Date(s.completedAt).toLocaleString()
                          : "-"}
                      </td>

                      <td className="px-6 py-3 text-right font-semibold text-white whitespace-nowrap">
                        {Number(s.totalDistanceMiles || 0).toFixed(1)}
                      </td>

                      <td className="px-6 py-3 text-right text-white/80 whitespace-nowrap">
                        {formatDuration(s.durationSeconds || 0)}
                      </td>

                      <td className="px-6 py-3 text-right text-white/80 whitespace-nowrap">
                        {formatMph(mph)}
                      </td>
                    </tr>
                  );
                })}

                {recentRoutes.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-white/70" colSpan={5}>
                      No route summaries yet.
                    </td>
                  </tr>
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


function KpiCard({ title, value, subtitle, gradient, icon }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white/70">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-white/60">{subtitle}</p>
        </div>
        <div className="text-xl">{icon}</div>
      </div>
    </div>
  );
}

function MiniStat({ title, value, accent = "from-sky-400 to-indigo-400" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-white/60">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-lg font-bold text-white">{value}</p>
        <span className={`h-2 w-10 rounded-full bg-gradient-to-r ${accent}`} />
      </div>
    </div>
  );
}

function MiniStatSmall({ title, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-white/60">{title}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}