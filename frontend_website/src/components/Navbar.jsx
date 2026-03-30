import { getEmail, logout } from "../auth/authService";

export default function Navbar() {
  const email = getEmail();

  return (
    <header style={{ borderBottom: "1px solid rgba(199,183,136,0.2)", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}>
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl text-white font-bold shadow" style={{ background: "linear-gradient(135deg, #9FCC81, #66AFB6)" }}>
            D
          </div>
          <div className="leading-tight">
            <div className="text-white font-semibold text-lg">DriverLog</div>
            <div className="text-xs" style={{ color: "#C7B788" }}>Employer Portal</div>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-4">
          {email && (
            <div className="text-sm" style={{ color: "#C7B788" }}>
              Signed in as:
              <span className="ml-2 font-semibold text-white">{email}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ background: "rgba(199,183,136,0.12)", border: "1px solid rgba(199,183,136,0.3)", color: "#C7B788" }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(199,183,136,0.2)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(199,183,136,0.12)"}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}