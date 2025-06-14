import {
  type AuthProvider,
  JWTTokenPayload,
  OrganizationInfo,
} from "@dafthunk/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import useSWR from "swr";

import { AuthError, authService } from "@/services/auth-service";

export const AUTH_USER_KEY = "/auth/user";

type AuthContextType = {
  readonly user: JWTTokenPayload | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly loginError: Error | null;
  readonly organization: OrganizationInfo | null;
  login: (provider: AuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<{
    success: boolean;
    user?: JWTTokenPayload;
    error?: string;
  }>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error: swrError,
    isLoading,
    mutate: mutateUser,
  } = useSWR<JWTTokenPayload | null>(
    AUTH_USER_KEY,
    authService.getCurrentUser,
    {
      // Retry failed requests, but not for auth errors
      shouldRetryOnError: (error) => !(error instanceof AuthError),
      // Refresh user data every 5 minutes when tab is focused
      refreshInterval: 5 * 60 * 1000,
      // Only refresh when tab is visible
      refreshWhenHidden: false,
      // Validate user data structure
      onSuccess: (data) => {
        if (data && (!data.sub || !data.name)) {
          console.error("Invalid user data structure received");
          mutateUser(null, { revalidate: false });
        }
      },
    }
  );

  const [loginError, setLoginError] = useState<Error | null>(null);

  const isAuthenticated = !!user?.sub;

  // Extract organization information with validation
  const organization =
    user?.organization && user.organization.id ? user.organization : null;

  const clearError = useCallback(() => {
    setLoginError(null);
  }, []);

  const refreshUserContext = useCallback(async (): Promise<void> => {
    try {
      await mutateUser();
    } catch (error) {
      console.error("Failed to refresh user context:", error);
      throw error;
    }
  }, [mutateUser]);

  const login = useCallback(async (provider: AuthProvider): Promise<void> => {
    setLoginError(null);
    try {
      await authService.loginWithProvider(provider);
    } catch (err) {
      console.error("Login process error:", err);
      const error = err instanceof Error ? err : new Error(String(err));
      setLoginError(error);
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Don't throw - logout should always succeed from user perspective
    }
  }, []);

  const logoutAllSessions = useCallback(async (): Promise<void> => {
    try {
      await authService.logoutAllSessions();
    } catch (error) {
      console.error("Logout all sessions error:", error);
      // Don't throw - logout should always succeed from user perspective
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<{
    success: boolean;
    user?: JWTTokenPayload;
    error?: string;
  }> => {
    try {
      const result = await authService.refreshToken();

      // If refresh was successful, update the SWR cache
      if (result.success && result.user) {
        mutateUser(result.user, { revalidate: false });
      } else if (!result.success) {
        // If refresh failed, clear the user data to trigger re-authentication
        console.warn("Token refresh failed, clearing user data");
        mutateUser(null, { revalidate: false });
      }

      return result;
    } catch (error) {
      console.error("Token refresh error:", error);
      // Clear user data on refresh error to trigger re-authentication
      mutateUser(null, { revalidate: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, [mutateUser]);

  // Process errors for user-friendly messages
  const processedError =
    swrError instanceof AuthError
      ? new Error("Authentication failed. Please log in again.")
      : swrError;

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isAuthenticated,
        isLoading,
        error: processedError,
        loginError,
        organization,
        login,
        logout,
        logoutAllSessions,
        refreshUser: refreshUserContext,
        refreshToken,
        clearError,
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
