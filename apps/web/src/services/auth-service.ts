import { AuthProvider, User } from "@dafthunk/types";
import { mutate } from "swr";

import { AUTH_USER_KEY } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";

import { makeRequest } from "./utils";

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

  // Refresh the access token using the refresh token
  async refreshToken(): Promise<{ success: boolean; user?: User }> {
    try {
      const response = await makeRequest<{ success: boolean; user: User }>(
        "/auth/refresh",
        {
          method: "POST",
        }
      );

      if (response.success && response.user) {
        // Update the SWR cache with the fresh user data
        mutate(AUTH_USER_KEY, response.user, { revalidate: false });
        return { success: true, user: response.user };
      }

      return { success: false };
    } catch (error) {
      console.error("Token refresh failed:", error);
      return { success: false };
    }
  },

  // Login with a provider
  async loginWithProvider(provider: AuthProvider): Promise<void> {
    window.location.href = `${getApiBaseUrl()}/auth/login/${provider}`;
  },

  // Logout the user
  async logout(): Promise<void> {
    try {
      await makeRequest<void>("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Invalidate SWR cache and redirect
      mutate(AUTH_USER_KEY, null, { revalidate: false });
      window.location.href = "/";
    }
  },

  // Logout all sessions for the user
  async logoutAllSessions(): Promise<void> {
    try {
      await makeRequest<void>("/auth/logout-all", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout all sessions failed:", error);
    } finally {
      // Invalidate SWR cache and redirect
      mutate(AUTH_USER_KEY, null, { revalidate: false });
      window.location.href = "/";
    }
  },
} as const;
