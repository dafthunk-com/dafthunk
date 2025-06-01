import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowWaitlisted?: boolean;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
  allowWaitlisted = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <InsetLoading />;
  }

  if (!isAuthenticated) {
    // Save the current location they were trying to go to
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user is on waitlist and this route doesn't allow waitlisted users
  if (user?.inWaitlist && !allowWaitlisted) {
    return <Navigate to="/waitlist" replace />;
  }

  return <>{children}</>;
}
