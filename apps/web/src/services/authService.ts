import { API_BASE_URL } from "@/config/api";

export interface User {
  id: string; // UUID (from JWT sub)
  name: string;
  email: string | null; // Email can be null
  provider: string; // Provider used for the current login session (from JWT)
  avatarUrl?: string | null; // Optional avatar URL (from JWT)
  plan?: string; // Plan (from JWT)
  role?: string; // Role (from JWT)
  githubId?: string | null; // GitHub ID (from JWT)
  googleId?: string | null; // Google ID (from JWT)
}

export interface TokenInfo {
  expiresIn: number;
  issuedAt: number;
  expiresAt: number;
}

export const authService = {
  // Check if the user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/protected`, {
        method: "GET",
        credentials: "include", // Important for cookies
      });
      return response.ok;
    } catch (error) {
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
  async loginWithProvider(provider: "github" | "google"): Promise<void> {
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
};
