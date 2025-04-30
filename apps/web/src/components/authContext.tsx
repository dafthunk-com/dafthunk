import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { 
  authService, 
  User,
  type AuthProvider
} from "@/services/authService";

type AuthContextType = {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  login: (provider: AuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isAuthenticatedRef = useRef<boolean>(false);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const refreshUser = async (): Promise<boolean> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      const isAuth = !!currentUser;
      setIsAuthenticated(isAuth);
      return isAuth;
    } catch (_) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  const refreshUserContext = async (): Promise<void> => {
    await refreshUser();
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const isAuth = await authService.checkAuth();
        
        if (isAuth) {
          const userAuthenticated = await refreshUser();
          isAuthenticatedRef.current = userAuthenticated;
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (_) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (provider: AuthProvider): Promise<void> => {
    try {
      setIsLoading(true);
      await authService.loginWithProvider(provider);
    } catch (_) {
      // Login will redirect, so we don't need to handle errors here
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}
