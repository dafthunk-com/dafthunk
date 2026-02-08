import { Navigate, useSearchParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { LoginForm } from "@/components/login-form";
import { useOrgUrl } from "@/hooks/use-org-url";

export function LoginPage() {
  const { user, isAuthenticated } = useAuth();
  const { getOrgUrl } = useOrgUrl();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  if (isAuthenticated && user) {
    if (returnTo) {
      return <Navigate to={returnTo} />;
    }
    return <Navigate to={getOrgUrl("dashboard")} />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm returnTo={returnTo ?? undefined} />
      </div>
    </div>
  );
}
