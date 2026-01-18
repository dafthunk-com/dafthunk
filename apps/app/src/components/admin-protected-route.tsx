import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route component that only allows access to admin users.
 * Redirects to home for non-admin users and to login for unauthenticated users.
 */
export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <InsetLoading />;
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== "admin") {
    // Non-admin users are redirected to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
