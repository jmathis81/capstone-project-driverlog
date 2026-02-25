import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { msalInstance, loginRequest } from "../auth/msal";
import { getActiveAccount } from "../auth/authService";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if a user is already signed in
    const account = getActiveAccount();
    // If a user exists, automatically go to dashboard
    // prevents logged-in users from seeing login page again
    if (account) navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {/* decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200 blur-3xl opacity-40" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-amber-200 blur-3xl opacity-40" />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-emerald-200 blur-3xl opacity-30" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2">
        {/* Left side card */}
        <div className="hidden md:block">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-10 text-white shadow-xl">
            <div className="text-sm font-semibold tracking-wide text-slate-200">
              DriverLog Employer
            </div>

            <h1 className="mt-3 text-3xl font-bold leading-tight">
              Manage drivers, assignments, reports — all in one place.
            </h1>

            <p className="mt-4 text-slate-200">
              Sign in with your Microsoft account to access the employer portal.
            </p>

            <ul className="mt-8 space-y-3 text-slate-100">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Review flagged logs and resolve issues fast
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-sky-400" />
                Track route summaries and daily activity
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-300" />
                Export reports for bookkeeping and audits
              </li>
            </ul>

            <div className="mt-10 text-xs text-slate-300">
              © {new Date().getFullYear()} DriverLog
            </div>
          </div>
        </div>

        {/* Right login card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white">
                DL
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  DriverLog Employer
                </div>
                <div className="text-xs text-slate-500">
                  Secure sign-in with Microsoft
                </div>
              </div>
            </div>

            <h2 className="mt-8 text-2xl font-bold text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You’ll be redirected to Microsoft to complete authentication.
            </p>

            <button
              onClick={() => msalInstance.loginRedirect(loginRequest)}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              {/* Simple Microsoft “window” icon */}
              <span className="grid grid-cols-2 gap-0.5">
                <span className="h-2.5 w-2.5 bg-[#F25022]" />
                <span className="h-2.5 w-2.5 bg-[#7FBA00]" />
                <span className="h-2.5 w-2.5 bg-[#00A4EF]" />
                <span className="h-2.5 w-2.5 bg-[#FFB900]" />
              </span>
              Continue with Microsoft
            </button>
          </div>

          {/* Small footer for mobile */}
          <div className="mt-6 text-center text-xs text-slate-500 md:hidden">
            © {new Date().getFullYear()} DriverLog
          </div>
        </div>
      </div>
    </div>
  );
}