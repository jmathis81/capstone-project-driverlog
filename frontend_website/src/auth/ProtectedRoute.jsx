import { Navigate } from "react-router-dom";
import { getActiveAccount } from "./authService";

// This protects routes that require login
export default function ProtectedRoute({ children }) {
  // Check if a user is logged in
  const account = getActiveAccount(); 
  // If no account is found, redirect user to login page
  if (!account) return <Navigate to="/login" replace />;
  // If user is logged in, allow access to the protected content
  return children;
}