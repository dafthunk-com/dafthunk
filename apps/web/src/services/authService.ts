import { API_BASE_URL } from "@/config/api";

export type User = {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly provider: string;
  readonly avatarUrl?: string | null;
  readonly plan?: string;
  readonly role?: string;
  readonly githubId?: string | null;
  readonly googleId?: string | null;
};

export type TokenInfo = {
  readonly expiresIn: number;
  readonly issuedAt: number;
  readonly expiresAt: number;
};

export type AuthProvider = "github" | "google";

export const authService = {
  // Check if the user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/protected`, {
        method: "GET",
        credentials: "include", // Important for cookies
      });
      return response.ok;
    } catch (_) {
      console.log("Authentication check failed");
      return false;
    }
  },

  // Get the current user information
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        method: "GET",
        credentials: "include", // Important for cookies
      });

      if (response.ok) {
        const data = await response.json();
        return data.user;
      }
      return null;
    } catch (error) {
      console.error("Failed to get user info:", error);
      return null;
    }
  },

  // Login with a provider
  async loginWithProvider(provider: AuthProvider): Promise<void> {
    window.location.href = `${API_BASE_URL}/auth/login/${provider}`;
  },

  // Logout the user
  async logout(): Promise<void> {
    try {
      // Make a fetch request to the logout endpoint
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "GET",
        credentials: "include", // Important for cookies
      });

      // Check if the response is a redirect
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        // If not redirected, redirect to home page
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if the request fails, redirect to home
      window.location.href = "/";
    }
  },

  // Logout all sessions for the user
  async logoutAllSessions(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout-all`, {
        method: "POST",
        credentials: "include",
      });
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout all sessions failed:", error);
      window.location.href = "/";
    }
  },
} as const;
