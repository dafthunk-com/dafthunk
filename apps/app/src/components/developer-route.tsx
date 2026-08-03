import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";

interface DeveloperRouteProps {
  children: React.ReactNode;
}

/**
 * Route component that only allows access to users with developer mode enabled.
 * Redirects to home for everyone else, and to login when unauthenticated.
 */
export function DeveloperRoute({ children }: DeveloperRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <InsetLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user?.developerMode) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
