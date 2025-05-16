import { useAuth } from "@/components/auth-context";
import { LoginForm } from "@/components/login-form";
import { Navigate } from "react-router-dom";

export function HomePage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  );
}
