import { getEmail, logout } from "../auth/authService";

export default function Navbar() {
  const email = getEmail();

  return (
    <header className="border-b border-white/10 bg-white/5 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">

        {/* LEFT SIDE - BRAND */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold shadow">
            D
          </div>

          <div className="leading-tight">
            <div className="text-white font-semibold text-lg">
              DriverLog
            </div>
            <div className="text-xs text-white/60">
              Employer Portal
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - USER INFO */}
        <div className="flex items-center gap-4">

          {email && (
            <div className="text-sm text-white/70">
              Signed in as:
              <span className="ml-2 font-semibold text-white">
                {email}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Logout
          </button>

        </div>
      </div>
    </header>
  );
}