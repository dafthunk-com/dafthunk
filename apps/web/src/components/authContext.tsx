import { createContext, useContext, ReactNode } from "react";
import useSWR from "swr";
import { authService, User, type AuthProvider, OrganizationInfo } from "@/services/authService";

export const AUTH_USER_KEY = "/auth/user";

type AuthContextType = {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly organization: OrganizationInfo | null;
  login: (provider: AuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
    mutate: mutateUser,
  } = useSWR<User | null>(AUTH_USER_KEY, authService.getCurrentUser);

  const isAuthenticated = !!user;
  
  // Extract organization information
  const organization = user?.organization || null;

  const refreshUserContext = async (): Promise<void> => {
    await mutateUser();
  };

  const login = async (provider: AuthProvider): Promise<void> => {
    try {
      await authService.loginWithProvider(provider);
    } catch (loginError) {
      console.error("Login process error:", loginError);
    }
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
  };

  const logoutAllSessions = async (): Promise<void> => {
    await authService.logoutAllSessions();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAuthenticated,
        isLoading,
        error,
        organization,
        login,
        logout,
        logoutAllSessions,
        refreshUser: refreshUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
