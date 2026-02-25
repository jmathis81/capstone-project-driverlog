import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Assignments from "./pages/Assignments";
import Reports from "./pages/Reports";
import Flagged from "./pages/Flagged";
import Login from "./pages/Login";
import ProtectedRoute from "./auth/ProtectedRoute";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public */}
        <Route path="/Login" element={<Login />} />

        {/* protected */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* when user goes to "/" send them to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="flagged" element={<Flagged />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
