import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
// User type now matches the JWT payload (includes avatarUrl, excludes provider IDs)
import { authService, User } from "@/services/authService";

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
  }, []);

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
