import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { msalInstance, loginRequest } from "../auth/msal";
import { getActiveAccount } from "../auth/authService";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const account = getActiveAccount();
    if (account) navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="relative min-h-screen" style={{ background: "#f5f2eb" }}>

      {/* decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-40" style={{ background: "#9FCC81" }} />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full blur-3xl opacity-35" style={{ background: "#66AFB6" }} />
        <div className="absolute -bottom-24 left-1/3 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: "#C7B788" }} />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2">
        {/* Left info card */}
        <div className="hidden md:block">
          <div className="rounded-3xl p-10 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #2d3a2e 0%, #1e2a2b 100%)" }}>
            <div className="text-sm font-semibold tracking-wide" style={{ color: "#9FCC81" }}>
              DriverLog Employer
            </div>

            <h1 className="mt-3 text-3xl font-bold leading-tight text-white">
              Manage drivers, assignments, reports — all in one place.
            </h1>

            <p className="mt-4" style={{ color: "#C7B788" }}>
              Sign in with your Microsoft account to access the employer portal.
            </p>

            <ul className="mt-8 space-y-3" style={{ color: "#e8e4d8" }}>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full" style={{ background: "#9FCC81" }} />
                Review flagged logs and resolve issues fast
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full" style={{ background: "#66AFB6" }} />
                Track route summaries and daily activity
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-2 w-2 rounded-full" style={{ background: "#C7B788" }} />
                Export reports for bookkeeping and audits
              </li>
            </ul>

            <div className="mt-10 text-xs" style={{ color: "#9FCC81" }}>
              © {new Date().getFullYear()} DriverLog
            </div>
          </div>
        </div>

        {/* Right login card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-xl" style={{ border: "1px solid #C7B788" }}>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl text-white font-bold" style={{ background: "#2d3a2e" }}>
                DL
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#2d3a2e" }}>
                  DriverLog Employer
                </div>
                <div className="text-xs" style={{ color: "#8a7a60" }}>
                  Secure sign-in with Microsoft
                </div>
              </div>
            </div>

            <h2 className="mt-8 text-2xl font-bold" style={{ color: "#2d3a2e" }}>
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#6b5d45" }}>
              You'll be redirected to Microsoft to complete authentication.
            </p>

            <button
              onClick={() => msalInstance.loginRedirect(loginRequest)}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ background: "#66AFB6", focusRingColor: "#66AFB6" }}
            >
              <span className="grid grid-cols-2 gap-0.5">
                <span className="h-2.5 w-2.5 bg-[#F25022]" />
                <span className="h-2.5 w-2.5 bg-[#7FBA00]" />
                <span className="h-2.5 w-2.5 bg-[#00A4EF]" />
                <span className="h-2.5 w-2.5 bg-[#FFB900]" />
              </span>
              Continue with Microsoft
            </button>
          </div>

          <div className="mt-6 text-center text-xs md:hidden" style={{ color: "#8a7a60" }}>
            © {new Date().getFullYear()} DriverLog
          </div>
        </div>
      </div>
    </div>
  );
}