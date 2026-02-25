import { Link, NavLink } from "react-router-dom";
import { getEmail, logout } from "../auth/authService";

const linkClass = ({ isActive }) =>
  [
    "px-3 py-2 rounded-lg text-sm font-medium transition",
    isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
  ].join(" ");

export default function Navbar() {

    const email = getEmail();

    return (
        <header className= "border-b bg-white">
            <div className= "mx-auto max-w-6xl px-4 py-3 flex justify-between">
                <Link to="/" className="font-semibold">
                    DriverLog <span className="text-gray-500">Employer</span>
                </Link>

                <nav className="flex gap-2">

                    <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
                    <NavLink to="/assignments" className={linkClass}>Assignments</NavLink>
                    <NavLink to="/reports" className={linkClass}>Reports</NavLink>
                    <NavLink to="/flagged" className={linkClass}>Flagged</NavLink>

                    {email && (
                        <span className="text-sm text-gray-600 ml-4">
                            Signed in as : <b>{email}</b>
                        </span>
                    )}

                    <button className="ml-3 px-3 py-2 rounded bg-gray-900 text-white text-sm" onClick={logout}>
                        Logout
                    </button>

                </nav>

            </div>

        </header>

    );
}