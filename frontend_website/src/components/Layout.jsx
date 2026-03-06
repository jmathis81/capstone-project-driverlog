import Navbar from "./Navbar";
import { NavLink, Outlet } from "react-router-dom";

const sideLinkClass = ({ isActive }) =>
  "flex items-center gap-2 px-3 py-2 rounded-lg transition " +
  (isActive
    ? "bg-white/15 text-white ring-1 ring-white/15"
    : "text-white/75 hover:bg-white/10");

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
    
      <div className="pointer-events-none fixed inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-sky-500 blur-3xl" />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <Navbar />

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-64 md:flex-col border-r border-white/10 bg-white/5 backdrop-blur">
            <div className="px-5 py-4 border-b border-white/10">
              <div className="font-bold text-lg text-white">DriverLog</div>
              <div className="text-xs text-white/60">Employer Portal</div>
            </div>

            <nav className="p-3 text-sm">
              <div className="text-xs font-semibold text-white/40 px-3 py-2">
                HOME
              </div>

              <NavLink to="/dashboard" className={sideLinkClass}>
                <span>📊</span>
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/assignments" className={sideLinkClass}>
                <span>📦</span>
                <span>Assignments</span>
              </NavLink>

              <NavLink to="/reports" className={sideLinkClass}>
                <span>🧾</span>
                <span>Reports</span>
              </NavLink>

              <NavLink to="/flagged" className={sideLinkClass}>
                <span>🚩</span>
                <span>Flagged</span>
              </NavLink>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 px-4 py-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>

        <footer className="border-t border-white/10 bg-white/5 backdrop-blur text-sm text-white/60">
          <div className="max-w-6xl mx-auto px-4 py-3">
            © {new Date().getFullYear()} DriverLog
          </div>
        </footer>
      </div>
    </div>
  );
}