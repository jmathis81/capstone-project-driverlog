import Navbar from "./Navbar";
import { NavLink, Outlet } from "react-router-dom";

const sideLinkClass = ({ isActive }) =>
  "flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium " +
  (isActive ? "text-white" : "hover:text-white");

const sideLinkStyle = (isActive) => isActive
  ? { background: "rgba(159,204,129,0.15)", color: "#9FCC81", border: "1px solid rgba(159,204,129,0.25)" }
  : { color: "#C7B788" };

export default function Layout() {
  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg, #1a2a1b 0%, #1e2a2b 50%, #1a2020 100%)" }}>
      {/* glow blobs */}
      <div className="pointer-events-none fixed inset-0 opacity-20">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#9FCC81" }} />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl" style={{ background: "#66AFB6" }} />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: "#C7B788" }} />
      </div>

      <div className="relative min-h-screen flex flex-col">
        <Navbar />

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-64 md:flex-col" style={{ borderRight: "1px solid rgba(199,183,136,0.15)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(199,183,136,0.15)" }}>
              <div className="font-bold text-lg text-white">DriverLog</div>
              <div className="text-xs" style={{ color: "#C7B788" }}>Employer Portal</div>
            </div>

            <nav className="p-3 text-sm">
              <div className="text-xs font-semibold px-3 py-2" style={{ color: "rgba(199,183,136,0.5)" }}>HOME</div>

              {[
                { to: "/dashboard", icon: "📊", label: "Dashboard" },
                { to: "/assignments", icon: "📦", label: "Assignments" },
                { to: "/reports", icon: "🧾", label: "Reports" },
                { to: "/flagged", icon: "🚩", label: "Flagged" },
              ].map(({ to, icon, label }) => (
                <NavLink key={to} to={to} className={({ isActive }) => "flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium " + (isActive ? "" : "")}>
                  {({ isActive }) => (
                    <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg transition" style={sideLinkStyle(isActive)}>
                      <span>{icon}</span>
                      <span>{label}</span>
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 px-4 py-8">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>

        <footer className="text-sm" style={{ borderTop: "1px solid rgba(199,183,136,0.15)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)", color: "#C7B788" }}>
          <div className="max-w-6xl mx-auto px-4 py-3">
            © {new Date().getFullYear()} DriverLog
          </div>
        </footer>
      </div>
    </div>
  );
}