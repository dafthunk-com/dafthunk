import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from "react";
// User type now matches the JWT payload (includes avatarUrl, excludes provider IDs)
import { authService, User, RenewalResponse } from "@/services/authService";

interface AuthContextType {
  user: User | null; // User reflects JWT payload
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: "github" | "google") => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const renewalTimerRef = useRef<number | null>(null);
  const isAuthenticatedRef = useRef<boolean>(false); // Add a ref to track authentication state

  // Update the ref whenever isAuthenticated changes
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      const isAuth = !!currentUser;
      setIsAuthenticated(isAuth);
      return isAuth; // Return the authentication state for internal use
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  // This is the function exposed in the context, which matches the expected void return type
  const refreshUserContext = async (): Promise<void> => {
    await refreshUser();
  };

  // Function to schedule token renewal
  const scheduleTokenRenewal = (timeUntilRenewal: number) => {
    // Clear any existing timer
    if (renewalTimerRef.current !== null) {
      window.clearTimeout(renewalTimerRef.current);
    }

    // Schedule the renewal
    renewalTimerRef.current = window.setTimeout(renewToken, timeUntilRenewal);
    console.log(
      `Token renewal scheduled in ${Math.round(timeUntilRenewal / 1000)} seconds`
    );
  };

  // Function to renew the token
  const renewToken = useCallback(async () => {
    try {
      // Use the ref instead of the state to check authentication
      if (!isAuthenticatedRef.current) {
        console.log("Token renewal skipped - not authenticated (ref value)");
        return;
      }

      console.log("Attempting token renewal at", new Date().toISOString());
      const renewalResponse = await authService.renewToken();

      if (renewalResponse) {
        console.log(
          "Renewal response received:",
          JSON.stringify(renewalResponse)
        );
        console.log(
          `Token renewal ${renewalResponse.renewed ? "successful" : "not needed"}`
        );
        console.log(
          `Token expires in ${renewalResponse.tokenInfo.expiresIn} seconds`
        );

        // Calculate when to schedule the next renewal (after 30 seconds)
        const timeUntilNextRenewal =
          calculateTimeUntilNextRenewal(renewalResponse);

        console.log(
          `Next renewal scheduled in ${Math.round(timeUntilNextRenewal / 1000)} seconds`
        );

        // Schedule the next renewal
        scheduleTokenRenewal(timeUntilNextRenewal);
      } else {
        // If renewal failed, try again in 10 seconds
        console.warn("Token renewal failed, retrying in 10 seconds");
        scheduleTokenRenewal(10 * 1000);
      }
    } catch (error) {
      console.error("Error during token renewal:", error);
      // If there was an error, try again in 10 seconds
      console.warn("Error occurred, retrying in 10 seconds");
      scheduleTokenRenewal(10 * 1000);
    }
  }, []); // Empty dependency array since we're using refs

  // Calculate when to schedule the next renewal (after 30 seconds)
  const calculateTimeUntilNextRenewal = (_: RenewalResponse): number => {
    // For testing purposes, we're using a fixed renewal interval of 30 seconds
    // This is half of the token lifetime of 60 seconds
    const renewalInterval = 30 * 1000; // 30 seconds in milliseconds

    // Ensure we don't schedule in the past
    return Math.max(renewalInterval, 1000); // Minimum 1 second
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Check if user is authenticated
        const isAuth = await authService.checkAuth();
        console.log("Authentication check result:", isAuth);

        if (isAuth) {
          // If authenticated, get user info and update the authentication state
          const userAuthenticated = await refreshUser();
          console.log(
            "User refreshed, authentication state:",
            userAuthenticated
          );

          // Directly update the ref to ensure it's set before calling renewToken
          isAuthenticatedRef.current = userAuthenticated;

          if (userAuthenticated) {
            console.log("Starting token renewal process");
            // Start the token renewal process immediately
            setTimeout(() => renewToken(), 100); // Small delay to ensure state updates have propagated
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Cleanup function to clear the timer when component unmounts
    return () => {
      if (renewalTimerRef.current !== null) {
        window.clearTimeout(renewalTimerRef.current);
        console.log("Token renewal timer cleared on unmount");
      }
    };
  }, [renewToken]);

  const login = async (provider: "github" | "google") => {
    try {
      setIsLoading(true);
      await authService.loginWithProvider(provider);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear the renewal timer when logging out
    if (renewalTimerRef.current !== null) {
      window.clearTimeout(renewalTimerRef.current);
      renewalTimerRef.current = null;
    }

    // Reset the authentication ref
    isAuthenticatedRef.current = false;

    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser: refreshUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
