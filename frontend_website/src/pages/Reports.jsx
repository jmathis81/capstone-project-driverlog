import { useEffect, useMemo, useState, useRef } from "react";
import { getSummaries } from "../api/driverlogAPI";

// Check if a date string falls on a specific local date
function isOnDate(dateStr, targetDate) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
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

function isInWeekOf(dateStr, referenceDate) {
  const d = new Date(dateStr);
  const start = startOfWeekSunday(referenceDate);
  const end = endOfWeekSundayExclusive(referenceDate);
  return d >= start && d < end;
}

// Format a Date as YYYY-MM-DD for the date input value
function toInputDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
  const [sortBy, setSortBy] = useState("milesDay");
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [polyline, setPolyline] = useState(null);
  const [polylineLoading, setPolylineLoading] = useState(false);
  const [polylineError, setPolylineError] = useState(null);

  async function handleRouteClick(s) {
    const routeId = s.routeId || s.id;
    setSelectedRoute(s);
    setPolyline(null);
    setPolylineError(null);
    setPolylineLoading(true);
    try {
      const { getAccessToken } = await import("../auth/token");
      const token = await getAccessToken();
      const res = await fetch(
        `https://driverlogbackend-cwe7gpeuamfhffgt.eastus-01.azurewebsites.net/api/routes/${routeId}/polyline`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to load route: ${res.status}`);
      const data = await res.json();
      setPolyline(data);
    } catch (err) {
      setPolylineError(err.message);
    } finally {
      setPolylineLoading(false);
    }
  }

  // Selected date for browsing past reports — defaults to today
  const [selectedDateStr, setSelectedDateStr] = useState(toInputDate(new Date()));
  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateStr]);

  const isToday = toInputDate(new Date()) === selectedDateStr;

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

  // Daily reports aggregated for the selected date
  const dailyReportsRaw = useMemo(() => {
    const map = new Map();
    for (const s of summaries) {
      const userId = s.userId || "Unknown";
      const displayName = s.username || s.userEmail || s.email || s.userId || "Unknown";
      if (!map.has(userId)) {
        map.set(userId, {
          userId, displayName,
          milesDay: 0, routesDay: 0, durationDaySec: 0,
          speedDaySum: 0, speedDayCount: 0, avgSpeedDayMph: 0,
          idleDaySec: 0,
          totalMiles: 0, totalRoutes: 0, totalDurationSec: 0,
        });
      }
      const agg = map.get(userId);
      const miles = Number(s.totalDistanceMiles) || 0;
      const duration = Number(s.durationSeconds) || 0;
      agg.totalMiles += miles;
      agg.totalRoutes += 1;
      agg.totalDurationSec += duration;

      if (s.completedAt && isOnDate(s.completedAt, selectedDate)) {
        agg.milesDay += miles;
        agg.routesDay += 1;
        agg.durationDaySec += duration;
        agg.idleDaySec += Number(s.idleSeconds) || 0;
        const mph = avgSpeedMphValue(s);
        if (mph > 0) { agg.speedDaySum += mph; agg.speedDayCount += 1; }
      }
    }
    const arr = Array.from(map.values());
    for (const a of arr) {
      a.avgDaySec = a.routesDay ? a.durationDaySec / a.routesDay : 0;
      a.avgOverallSec = a.totalRoutes ? a.totalDurationSec / a.totalRoutes : 0;
      a.avgSpeedDayMph = a.speedDayCount ? a.speedDaySum / a.speedDayCount : 0;
    }
    return arr;
  }, [summaries, selectedDate]);

  const dailyReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = dailyReportsRaw.filter((d) => {
      if (!q) return true;
      return String(d.displayName || "").toLowerCase().includes(q) || String(d.userId || "").toLowerCase().includes(q);
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return String(a.displayName).localeCompare(String(b.displayName));
      if (sortBy === "routesDay") return b.routesDay - a.routesDay;
      if (sortBy === "durationDay") return b.durationDaySec - a.durationDaySec;
      return b.milesDay - a.milesDay;
    });
  }, [dailyReportsRaw, search, sortBy]);

  const dailyTotals = useMemo(() => {
    let totalMiles = 0, totalRoutes = 0, totalDurationSec = 0;
    for (const d of dailyReportsRaw) {
      totalMiles += d.milesDay;
      totalRoutes += d.routesDay;
      totalDurationSec += d.durationDaySec;
    }
    return {
      totalMiles, totalRoutes, totalDurationSec,
      avgRouteSec: totalRoutes ? totalDurationSec / totalRoutes : 0,
      driversWithRoutes: dailyReportsRaw.filter((d) => d.routesDay > 0).length,
    };
  }, [dailyReportsRaw]);

  // Weekly summaries for the week containing the selected date
  const weeklySummaries = useMemo(() => {
    const weekStart = startOfWeekSunday(selectedDate);
    const weekEnd = endOfWeekSundayExclusive(selectedDate);
    const map = new Map();
    for (const s of summaries) {
      if (!s.completedAt || !isInWeekOf(s.completedAt, selectedDate)) continue;
      const userId = s.userId || "Unknown";
      const displayName = s.username || s.userEmail || s.email || s.userId || "Unknown";
      if (!map.has(userId)) map.set(userId, { userId, displayName, weekMiles: 0, weekRoutes: 0, weekDurationSec: 0, avgWeekSec: 0, idleWeekSec: 0 });
      const agg = map.get(userId);
      agg.weekMiles += Number(s.totalDistanceMiles) || 0;
      agg.weekRoutes += 1;
      agg.weekDurationSec += Number(s.durationSeconds) || 0;
      agg.idleWeekSec += Number(s.idleSeconds) || 0;
    }
    const arr = Array.from(map.values());
    for (const a of arr) a.avgWeekSec = a.weekRoutes ? a.weekDurationSec / a.weekRoutes : 0;
    arr.sort((a, b) => b.weekMiles - a.weekMiles);
    return { weekStart, weekEnd, rows: arr };
  }, [summaries, selectedDate]);

  // Export selected day's reports as CSV
  function handleExportCSV() {
    const rows = [
      ["Driver", "Routes", "Miles", "Avg Time", "Avg Speed"],
      ...dailyReports.map((u) => [
        u.displayName,
        u.routesDay,
        u.milesDay.toFixed(2),
        formatDuration(u.avgDaySec),
        formatMph(u.avgSpeedDayMph),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${selectedDateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportWeeklyCSV() {
    const weekStartStr = weeklySummaries.weekStart.toLocaleDateString().replace(/\//g, "-");
    const weekEndStr = new Date(weeklySummaries.weekEnd.getTime() - 1).toLocaleDateString().replace(/\//g, "-");
    const rows = [
      [`Weekly Report: ${weekStartStr} to ${weekEndStr}`],
      [],
      ["Driver", "Routes", "Miles", "Avg Route Time"],
      ...weeklySummaries.rows.map((u) => [
        u.displayName,
        u.weekRoutes,
        u.weekMiles.toFixed(2),
        formatDuration(u.avgWeekSec),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report-${weekStartStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  // Azure Maps ref and render effect
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!selectedRoute || !polyline || polylineLoading) return;
    if (!window.atlas) return;
    if (mapInstanceRef.current) { mapInstanceRef.current.dispose(); mapInstanceRef.current = null; }

    const coords = polyline?.geometry?.coordinates || [];
    if (coords.length === 0) return;

    const map = new window.atlas.Map("route-map", {
      authOptions: {
        authType: "subscriptionKey",
        subscriptionKey: import.meta.env.VITE_AZURE_MAPS_KEY,
      },
      style: "road",
      language: "en-US",
      renderWorldCopies: false,
      view: "Auto",
    });

    map.events.add("ready", () => {
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.setCamera({ bounds: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], padding: 60 });
      map.resize();

      const datasource = new window.atlas.source.DataSource();
      map.sources.add(datasource);
      datasource.add(new window.atlas.data.Feature(new window.atlas.data.LineString(coords)));
      map.layers.add(new window.atlas.layer.LineLayer(datasource, null, { strokeColor: "#0078FF", strokeWidth: 5 }));

      map.markers.add(new window.atlas.HtmlMarker({
        position: coords[0],
        htmlContent: `<div style="background:#9FCC81;color:#1a2a1b;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">S</div>`,
      }));
      map.markers.add(new window.atlas.HtmlMarker({
        position: coords[coords.length - 1],
        htmlContent: `<div style="background:#f87171;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)">E</div>`,
      }));
    });

    mapInstanceRef.current = map;
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.dispose(); mapInstanceRef.current = null; } };
  }, [selectedRoute, polyline, polylineLoading]);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #1a2a1b 0%, #1e2a2b 50%, #1a2020 100%)" }}>

      {/* Azure Maps Script */}
      {!window.atlas && (
        <>
          <link rel="stylesheet" href="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.css" />
          <script src="https://atlas.microsoft.com/sdk/javascript/mapcontrol/3/atlas.min.js"></script>
        </>
      )}

      {/* Route Map Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedRoute(null)}>
          <div className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl" style={{ background: "#1e2a2b", border: "1px solid rgba(199,183,136,0.25)" }} onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(199,183,136,0.15)" }}>
              <div>
                <h2 className="text-lg font-bold text-white">Route Map</h2>
                <p className="text-xs mt-0.5" style={{ color: "#C7B788" }}>
                  {selectedRoute.username || selectedRoute.userEmail || selectedRoute.userId || "Driver"} — {selectedRoute.completedAt ? new Date(selectedRoute.completedAt).toLocaleString() : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs" style={{ color: "#C7B788" }}>
                  <span>🛣️ {Number(selectedRoute.totalDistanceMiles || 0).toFixed(1)} mi</span>
                  <span>⏱️ {formatDuration(selectedRoute.durationSeconds || 0)}</span>
                  <span>⚡ {formatMph(avgSpeedMphValue(selectedRoute))}</span>
                </div>
                <button onClick={() => setSelectedRoute(null)} className="rounded-full w-8 h-8 flex items-center justify-center text-white" style={{ background: "rgba(255,255,255,0.08)" }}>✕</button>
              </div>
            </div>

            {/* Map container */}
            <div style={{ height: "480px", position: "relative", background: "#1a1a2e" }}>
              {polylineLoading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1e2a2b" }}>
                  <p className="text-sm" style={{ color: "#C7B788" }}>Loading route...</p>
                </div>
              )}
              {polylineError && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1e2a2b" }}>
                  <p className="text-sm text-rose-300">Failed to load route: {polylineError}</p>
                </div>
              )}
              {!polylineLoading && !polylineError && polyline?.geometry?.coordinates?.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1e2a2b" }}>
                  <p className="text-sm" style={{ color: "#C7B788" }}>No GPS points recorded for this route.</p>
                </div>
              )}
              <div id="route-map" style={{ width: "100%", height: "480px", position: "absolute", top: 0, left: 0 }} />
            </div>

            {/* Legend + Zoom controls */}
            <div className="px-6 py-3 flex items-center justify-between gap-4 text-xs" style={{ borderTop: "1px solid rgba(199,183,136,0.15)", color: "#C7B788" }}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span style={{ background: "#9FCC81", borderRadius: "50%", width: 10, height: 10, display: "inline-block" }} /> Start</span>
                <span className="flex items-center gap-1.5"><span style={{ background: "#f87171", borderRadius: "50%", width: 10, height: 10, display: "inline-block" }} /> End</span>
                <span className="flex items-center gap-1.5"><span style={{ background: "#0078FF", borderRadius: 4, width: 16, height: 4, display: "inline-block" }} /> Route path</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.setCamera({ zoom: mapInstanceRef.current.getCamera().zoom + 1, type: "ease", duration: 200 }); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(199,183,136,0.3)" }}
                  title="Zoom in"
                >+</button>
                <button
                  onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.setCamera({ zoom: mapInstanceRef.current.getCamera().zoom - 1, type: "ease", duration: 200 }); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-base"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(199,183,136,0.3)" }}
                  title="Zoom out"
                >−</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>Browse daily and weekly driver activity by date.</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: status === "Connected" ? "rgba(159,204,129,0.15)" : "rgba(199,183,136,0.12)", color: status === "Connected" ? "#9FCC81" : "#C7B788", border: `1px solid ${status === "Connected" ? "rgba(159,204,129,0.3)" : "rgba(199,183,136,0.25)"}` }}>
                  {status}
                </span>
                <span className="text-xs" style={{ color: "#C7B788" }}>Summaries: <span className="font-semibold text-white">{summaries.length}</span></span>
                {lastUpdated && <span className="text-xs" style={{ color: "#C7B788" }}>Updated: {lastUpdated.toLocaleTimeString()}</span>}
              </div>
              {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              <button onClick={load} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(199,183,136,0.3)" }}>Refresh</button>
            </div>
          </div>

          {/* Date picker */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold" style={{ color: "#C7B788" }}>Viewing date:</label>
            <input
              type="date"
              value={selectedDateStr}
              max={toInputDate(new Date())}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}
            />
            {!isToday && (
              <button
                onClick={() => setSelectedDateStr(toInputDate(new Date()))}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: "rgba(159,204,129,0.15)", color: "#9FCC81", border: "1px solid rgba(159,204,129,0.3)" }}
              >
                Back to today
              </button>
            )}
            <span className="text-sm font-semibold text-white">
              {isToday ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>

          {/* KPI cards for selected date */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { title: `Drivers with routes`, value: dailyTotals.driversWithRoutes, icon: "👥" },
              { title: `Total routes`, value: dailyTotals.totalRoutes, icon: "🧾" },
              { title: `Miles`, value: dailyTotals.totalMiles.toFixed(1), icon: "🛣️" },
              { title: `Time driving`, value: formatDuration(dailyTotals.totalDurationSec), icon: "⏱️" },
              { title: `Avg route time`, value: formatDuration(dailyTotals.avgRouteSec), icon: "📈" },
            ].map((k) => (
              <div key={k.title} className="rounded-2xl p-4 shadow-sm" style={{ border: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#C7B788" }}>{k.title}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{k.value}</p>
                    <p className="mt-1 text-xs" style={{ color: "#C7B788" }}>{isToday ? "Today" : selectedDate.toLocaleDateString()}</p>
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
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>
                One card per driver for{" "}
                <span className="font-semibold text-white">
                  {isToday ? "today" : selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver..." className="w-full sm:w-56 rounded-xl px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none" style={inputStyle} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                <option value="milesDay" style={{ background: "#1e2a2b" }}>Sort: Miles</option>
                <option value="routesDay" style={{ background: "#1e2a2b" }}>Sort: Routes</option>
                <option value="durationDay" style={{ background: "#1e2a2b" }}>Sort: Time</option>
                <option value="name" style={{ background: "#1e2a2b" }}>Sort: Name</option>
              </select>
              <div className="text-sm" style={{ color: "#C7B788" }}>Drivers: <span className="font-semibold text-white">{dailyReports.length}</span></div>
              <button onClick={handleExportCSV} disabled={dailyReports.length === 0} className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40" style={{ background: "#9FCC81", color: "#1a2a1b" }}>
                Download CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {dailyReports.map((u, idx) => {
              const hasRoutes = u.routesDay > 0;
              const isTop = idx === 0 && hasRoutes;
              return (
                <div key={u.userId} className="rounded-2xl p-5 shadow-sm transition hover:-translate-y-px" style={{ border: "1px solid rgba(199,183,136,0.2)", background: hasRoutes ? "rgba(159,204,129,0.07)" : "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${userBadgeClass(u.displayName)}`}>
                        <span className="break-all">{u.displayName}</span>
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isTop && <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "#C7B788", color: "#1a2a1b" }}>⭐ Top</span>}
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: hasRoutes ? "rgba(159,204,129,0.15)" : "rgba(199,183,136,0.1)", color: hasRoutes ? "#9FCC81" : "#C7B788", border: `1px solid ${hasRoutes ? "rgba(159,204,129,0.3)" : "rgba(199,183,136,0.2)"}` }}>
                        {u.routesDay} route{u.routesDay !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {[
                      { title: "Miles", value: u.milesDay.toFixed(1), accent: "#66AFB6" },
                      { title: "Avg time", value: formatDuration(u.avgDaySec), accent: "#9FCC81" },
                      { title: "Idle time", value: formatDuration(u.idleDaySec), accent: "#C7B788" },
                      { title: "Routes", value: u.routesDay, accent: "#9FCC81" },
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
                    <span>Overall avg: {formatDuration(u.avgOverallSec)}</span>
                    <span className={hasRoutes ? "font-semibold text-white" : ""}>{hasRoutes ? "Reported" : "No routes"}</span>
                  </div>
                </div>
              );
            })}
            {dailyReports.length === 0 && (
              <div className="text-sm col-span-3" style={{ color: "#C7B788" }}>No driver data for this date.</div>
            )}
          </div>
        </div>

        {/* Weekly Summaries */}
        <div className="mt-6 rounded-3xl p-6 shadow-sm" style={cardStyle}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Weekly Summary</h2>
              <p className="mt-1 text-sm" style={{ color: "#C7B788" }}>
                Week of{" "}
                <span className="font-semibold text-white">{weeklySummaries.weekStart.toLocaleDateString()}</span>
                {" → "}
                <span className="font-semibold text-white">{new Date(weeklySummaries.weekEnd.getTime() - 1).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm" style={{ color: "#C7B788" }}>Drivers: <span className="font-semibold text-white">{weeklySummaries.rows.length}</span></div>
              <button
                onClick={handleExportWeeklyCSV}
                disabled={weeklySummaries.rows.length === 0}
                className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
                style={{ background: "#9FCC81", color: "#1a2a1b" }}
              >
                Download CSV
              </button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {weeklySummaries.rows.map((u) => (
              <div key={u.userId} className="rounded-2xl p-5 shadow-sm transition hover:-translate-y-px" style={{ border: "1px solid rgba(102,175,182,0.2)", background: "rgba(102,175,182,0.05)" }}>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${userBadgeClass(u.displayName)}`}>
                  <span className="break-all">{u.displayName}</span>
                </span>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[{ title: "Miles", value: u.weekMiles.toFixed(1) }, { title: "Routes", value: u.weekRoutes }, { title: "Avg time", value: formatDuration(u.avgWeekSec) }, { title: "Idle time", value: formatDuration(u.idleWeekSec) }].map((m) => (
                    <div key={m.title} className="rounded-xl p-3" style={innerCard}>
                      <p className="text-xs font-semibold" style={{ color: "#C7B788" }}>{m.title}</p>
                      <p className="mt-1 text-base font-bold text-white">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {weeklySummaries.rows.length === 0 && (
              <div className="text-sm" style={{ color: "#C7B788" }}>No routes for this week.</div>
            )}
          </div>
        </div>

        {/* Recent Routes table */}
        <div className="mt-6 rounded-3xl shadow-sm overflow-hidden" style={cardStyle}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(199,183,136,0.15)", background: "rgba(255,255,255,0.03)" }}>
            <h3 className="font-bold text-white">All Route Summaries</h3>
            <p className="text-sm mt-1" style={{ color: "#C7B788" }}>Click any row to view the route on a map.</p>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead style={{ background: "rgba(0,0,0,0.15)", color: "#C7B788" }}>
                <tr style={{ borderBottom: "1px solid rgba(199,183,136,0.12)" }}>
                  {["Driver", "Completed", "Miles", "Duration", "Avg Speed"].map((h, i) => (
                    <th key={h} className={`px-6 py-3 font-semibold ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(showAllRoutes ? recentRoutes : recentRoutes.slice(0, 20)).map((s) => {
                  const userLabel = s.username || s.userEmail || s.email || s.userId || "Unknown";
                  return (
                    <tr key={s.id} onClick={() => handleRouteClick(s)} className="hover:bg-white/5 cursor-pointer" style={{ borderBottom: "1px solid rgba(199,183,136,0.07)" }}>
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
          {recentRoutes.length > 20 && (
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(199,183,136,0.12)", background: "rgba(0,0,0,0.1)" }}>
              <p className="text-xs" style={{ color: "#C7B788" }}>
                {showAllRoutes ? `Showing all ${recentRoutes.length} routes` : `Showing 20 of ${recentRoutes.length} routes`}
              </p>
              <button
                onClick={() => setShowAllRoutes(!showAllRoutes)}
                className="text-sm font-semibold"
                style={{ color: "#9FCC81" }}
              >
                {showAllRoutes ? "Show less ↑" : `View all (${recentRoutes.length}) →`}
              </button>
            </div>
          )}
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}