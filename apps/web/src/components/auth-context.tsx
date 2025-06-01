import { type AuthProvider, OrganizationInfo, User } from "@dafthunk/types";
import { createContext, ReactNode, useContext, useState } from "react";
import useSWR from "swr";

import { authService } from "@/services/auth-service";

export const AUTH_USER_KEY = "/auth/user";

type AuthContextType = {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly loginError: Error | null;
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

  const [loginError, setLoginError] = useState<Error | null>(null);

  const isAuthenticated = !!user;

  // Extract organization information
  const organization = user?.organization || null;

  const refreshUserContext = async (): Promise<void> => {
    await mutateUser();
  };

  const login = async (provider: AuthProvider): Promise<void> => {
    setLoginError(null);
    try {
      await authService.loginWithProvider(provider);
    } catch (err) {
      console.error("Login process error:", err);
      setLoginError(err instanceof Error ? err : new Error(String(err)));
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
        loginError,
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
