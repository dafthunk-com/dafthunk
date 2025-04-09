import { useEffect } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Crown, KeyRound, UserCog } from "lucide-react";
import { getAvatarUrl, getInitials } from "@/lib/utils/userUtils";

// Updated Helper component to always render a generic KeyRound icon
const ProviderIcon = ({ provider }: { provider: string }) => {
  // Always return the generic KeyRound icon regardless of the provider
  return <KeyRound className="h-4 w-4 mr-2 text-gray-500" />;
};

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
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Spinner className="h-8 w-8" />
        <p className="text-gray-500 mt-4">Loading profile...</p>
      </div>
    );
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
    <main className="h-full">
      <div className="h-full rounded-xl border border-white overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div className="relative h-full p-6 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                  {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />} 
                  <AvatarFallback className="text-xl">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{user.name}</CardTitle>
                  <CardDescription>{user.email || "No email provided"}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-gray-500">{user.name}</p>
                    </div>
                  </div>
                  
                  {user.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <ProviderIcon provider={user.provider} />
                    <div>
                      <p className="text-sm font-medium">Authentication Provider</p>
                      <p className="text-sm text-gray-500">{formatProviderName(user.provider)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <UserCog className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Role</p>
                      <p className="text-sm text-gray-500">{formatRoleName(user.role)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Crown className="h-4 w-4 mr-2" />
                    <div>
                      <p className="text-sm font-medium">Subscription Plan</p>
                      <p className="text-sm text-gray-500">{formatPlanName(user.plan)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
} 