import { API_BASE_URL } from "@/config/api";
import { makeRequest } from "./utils";
import { mutate } from "swr";
import { AUTH_USER_KEY } from "@/components/auth-context";

export type OrganizationRoleType = "member" | "admin" | "owner";

export interface OrganizationInfo {
  id: string;
  name: string;
  handle: string;
  role: OrganizationRoleType;
}

export interface User {
  sub: string;
  name: string;
  email?: string;
  provider: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  organization: OrganizationInfo;
  iat?: number;
  exp?: number;
}

export type AuthProvider = "github" | "google";

export const authService = {
  // Check if the user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      const response = await makeRequest<boolean>("/auth/protected", {
        method: "GET",
      });
      return response;
    } catch (_) {
      console.log("Authentication check failed");
      return false;
    }
  },

  // Get the current user information
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await makeRequest<{ user: User }>("/auth/user", {
        method: "GET",
      });
      return response.user;
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

      // Invalidate SWR cache before redirecting
      mutate(AUTH_USER_KEY, null, { revalidate: false });

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

      // Invalidate SWR cache before redirecting
      mutate(AUTH_USER_KEY, null, { revalidate: false });

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
