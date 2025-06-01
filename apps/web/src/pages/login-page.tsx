import { Navigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { LoginForm } from "@/components/login-form";

export function LoginPage() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    // Redirect waitlisted users to waitlist page, others to dashboard
    return <Navigate to={user.inWaitlist ? "/waitlist" : "/dashboard"} />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  );
}
