import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl, getInitials } from "@/utils/user-utils";

// Helper function to format provider name
const formatProviderName = (provider: string) => {
  if (!provider) return "Unknown";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

// Helper function to format role name
const formatRoleName = (role: string | undefined) => {
  if (!role) return "User"; // Default to User if undefined
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export function ProfilePage() {
  const { user, isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return <InsetLoading title="Profile" />;
  } else if (error) {
    return <InsetError title="Profile" errorMessage={error.message} />;
  }

  if (!user) {
    return null;
  }

  // Format the plan name for display
  const formatPlanName = (plan: string | undefined) => {
    if (!plan) return "Free";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const avatarSrc = getAvatarUrl(user);

  return (
    <InsetLayout title="Profile">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex items-center gap-4 mb-2">
          <Avatar className="h-14 w-14">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />}
            <AvatarFallback className="text-xl">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">
              {user.email || "No email provided"}
            </p>
          </div>
        </div>
        <form className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={user.name}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The name associated with this account
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              type="email"
              value={user.email || ""}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The email address associated with this account
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Authentication Provider
            </label>
            <input
              type="text"
              value={formatProviderName(user.provider)}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The service you used to sign up or log in (e.g., Google, GitHub).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <input
              type="text"
              value={formatRoleName(user.role)}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your access level or permissions within the application.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            <input
              type="text"
              value={formatPlanName(user.plan)}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your current subscription plan.
            </p>
          </div>
        </form>
      </div>
    </InsetLayout>
  );
}
