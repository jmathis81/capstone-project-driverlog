import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 flex-grow">
        <Outlet />
      </main>
      <footer className="border-t bg-white text-sm text-gray-500">
        <div className="max-w-6xl mx-auto px-4 py-8">
          © {new Date().getFullYear()} DriverLog
        </div>
      </footer>
    </div>
  );
}