import { NavLink } from "react-router-dom";
import { useEffect, useState} from "react";
import { getSummaries } from "../api/driverlogAPI";

export default function Dashboard() {
  const cards = [
    { label: "Active Drivers", value: "12", badge: "+12%", badgeType: "up" },
    { label: "Open Assignments", value: "7", badge: "+4%", badgeType: "up" },
    { label: "Reports Today", value: "15", badge: "-3%", badgeType: "down" },
    { label: "Flagged Entries", value: "2", badge: "+1", badgeType: "warn" },
  ];

  const activity = [
    { text: "Report received: Driver #42", time: "10:12 AM" },
    { text: 'Assignment created: "Deliver supplies"', time: "9:40 AM" },
    { text: "Flagged manual note: Driver #19", time: "Yesterday" },
  ];

  const badgeStyles = {
    up: "bg-emerald-50 text-emerald-700 border-emerald-200",
    down: "bg-red-50 text-red-700 border-red-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
  };

  //stores the data coming from your backend
  const [summaries, setSummaries] = useState([]);
  //shows if the backend is connected or not
  const [backendStatus, setBackendStatus] = useState("Loading summaries...");
  //stores any error message if something goes wrong
  const [backendError, setBackendError] = useState(null);

  useEffect(() => {
    async function load(){
        try {
            setBackendError(null);
            //Get route summaries from Azure
            const data = await getSummaries();
            //Saves the backend data and updates the status to "Connected"
            setSummaries(Array.isArray(data) ? data : []);
            setBackendStatus("Connected");
        } catch (error) {
            setBackendStatus("Not connected");
            setBackendError(error.message);
            setSummaries([]);
        }
    }
    load();
  }, []);


  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col bg-white border-r min-h-screen">
          <div className="px-5 py-4 border-b">
            <div className="font-bold text-lg text-gray-900">DriverLog</div>
            <div className="text-xs text-gray-500">Employer Portal</div>
          </div>

          <nav className="p-3 text-sm">
            <div className="text-xs font-semibold text-gray-400 px-3 py-2">HOME</div>

            <NavLink
                to="/"
                className={({ isActive }) =>
                    "flex items-center gap-2 px-3 py-2 rounded-lg " +
                    (isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
                }
            >
                <span>📊</span>
                <span>Dashboard</span>
            </NavLink>

            <NavLink
                to="/assignments"
                className={({ isActive }) =>
                    "flex items-center gap-2 px-3 py-2 rounded-lg " +
                    (isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
                }
            >
                <span>📦</span>
                <span>Assignments</span>
            </NavLink>

            <NavLink
                to="/reports"
                className={({ isActive }) =>
                    "flex items-center gap-2 px-3 py-2 rounded-lg " +
                    (isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
                }
            > 
                <span>🧾</span>
                 <span>Reports</span>
            </NavLink>

  
            <NavLink
                to="/flagged"
                className={({ isActive }) =>
                    "flex items-center gap-2 px-3 py-2 rounded-lg " +
                    (isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
                }
            >
                <span>🚩</span>
                <span>Flagged</span>
            </NavLink>

          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          {/* Top bar */}
          <div className="bg-white border-b">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Placeholder metrics for now.</p>
              </div>

              <div className="flex items-center gap-3">
                <button className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Export
                </button>
                <button className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                  + New Assignment
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
            {/* Backend connection proof */}
            <div className="rounded-2xl bg-white border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900">Backend Connection</h2>
              <p className="text-sm text-gray-600 mt-1">{backendStatus}</p>

              <p className="text-sm text-gray-700 mt-3">
                Summaries found: <span className="font-semibold">{summaries.length}</span>
              </p>

              <pre className="mt-3 text-xs bg-gray-50 border rounded-lg p-3 overflow-auto max-h-64">
                {JSON.stringify(summaries, null, 2)}
              </pre>
            </div>

            {/* Stat cards row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((item) => (
                <div key={item.label} className="rounded-2xl bg-white border shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">{item.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-gray-900">
                        {item.value}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeStyles[item.badgeType]}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <div className="mt-4 h-1 w-full rounded-full bg-gray-100">
                    <div className="h-1 w-2/3 rounded-full bg-gray-300" />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">Updated just now</p>
                </div>
              ))}
            </div>

            {/* Middle grid: big panel + activity */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Big panel card */}
              <div className="lg:col-span-2 rounded-2xl bg-white border shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Operations Snapshot</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                      This Week
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    Quick overview of what’s happening across drivers, assignments, and reports.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 border p-4">
                      <p className="text-xs text-gray-500">Most urgent</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        Review flagged entries
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {cards[3].value} entries waiting for review.
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 border p-4">
                      <p className="text-xs text-gray-500">Work in progress</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        Open assignments
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {cards[1].value} assignments currently open.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="bg-gray-900 text-white px-6 py-3 text-sm">
                  Tip: Keep flagged notes low by requiring end-of-day submissions.
                </div>
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl bg-white border shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <button className="text-sm font-semibold text-gray-700 hover:text-gray-900">
                    View all
                  </button>
                </div>

                <ul className="mt-4 divide-y">
                  {activity.map((a, idx) => (
                    <li key={idx} className="py-3 flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-800">{a.text}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{a.time}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-xl bg-gray-50 border p-4">
                  <p className="text-xs text-gray-500">Next recommended action</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    Check reports submitted today
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {cards[2].value} reports received so far.
                  </p>
                </div>
              </div>
            </div>

          
            <div className="rounded-2xl bg-white border shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Reports Overview</h2>
                <span className="text-xs text-gray-500">Coming soon</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 border p-4">
                  <p className="text-sm text-gray-500">Total reports today</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{cards[2].value}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border p-4">
                  <p className="text-sm text-gray-500">Drivers active</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{cards[0].value}</p>
                </div>
                <div className="rounded-xl bg-gray-50 border p-4">
                  <p className="text-sm text-gray-500">Flags</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{cards[3].value}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}