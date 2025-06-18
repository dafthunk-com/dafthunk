import { useCallback, useState } from "react";
import { toast } from "sonner";

import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { updateProfile, useProfile } from "@/services/profile-service";
import { getInitials } from "@/utils/user-utils";

// Helper function to format provider name
const formatProviderName = (profile: any) => {
  if (profile.githubId) return "GitHub";
  if (profile.googleId) return "Google";
  return "Unknown";
};

// Helper function to format role name
const formatRoleName = (role: string | undefined) => {
  if (!role) return "User"; // Default to User if undefined
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export function ProfilePage() {
  const { profile, isProfileLoading, profileError, mutateProfile } =
    useProfile();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEarlyAccessToggle = useCallback(
    async (checked: boolean) => {
      if (!profile) return;

      setIsUpdating(true);
      try {
        await updateProfile({ developerMode: checked });
        toast.success(`Early access ${checked ? "enabled" : "disabled"}`);
        await mutateProfile();
      } catch (error) {
        toast.error("Failed to update early access setting. Please try again.");
        console.error("Update profile error:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [profile, mutateProfile]
  );

  if (isProfileLoading) {
    return <InsetLoading title="Profile" />;
  } else if (profileError) {
    return <InsetError title="Profile" errorMessage={profileError.message} />;
  }

  if (!profile) {
    return null;
  }

  // Format the plan name for display
  const formatPlanName = (plan: string | undefined) => {
    if (!plan) return "Free";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const avatarSrc = profile.avatarUrl;

  return (
    <InsetLayout title="Profile">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex items-center gap-4 mb-2">
          <Avatar className="h-14 w-14">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={profile.name} />}
            <AvatarFallback className="text-xl">
              {getInitials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{profile.name}</h1>
            <p className="text-muted-foreground">
              {profile.email || "No email provided"}
            </p>
          </div>
        </div>
        <form className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={profile.name}
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
              value={profile.email || ""}
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
              value={formatProviderName(profile)}
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
              value={formatRoleName(profile.role)}
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
              value={formatPlanName(profile.plan)}
              readOnly
              className="w-full rounded-md border border-input bg-muted px-3 py-2 text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your current subscription plan.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Developer Mode
                </label>
                <p className="text-xs text-muted-foreground">
                  Enable early access to features under development.
                </p>
              </div>
              <Switch
                checked={profile.developerMode}
                onCheckedChange={handleEarlyAccessToggle}
                disabled={isUpdating}
              />
            </div>
          </div>
        </form>
      </div>
    </InsetLayout>
  );
}
