import { AuthProvider, JWTTokenPayload } from "@dafthunk/types";
import { mutate } from "swr";

import { AUTH_USER_KEY } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";

import { makeRequest } from "./utils";

// Error types for better error handling
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const authService = {
  // Check if the user is authenticated
  async checkAuth(): Promise<boolean> {
    try {
      const response = await makeRequest<{ ok: boolean }>("/auth/protected", {
        method: "GET",
      });
      return response.ok || false;
    } catch (error) {
      console.warn("Authentication check failed:", error);
      return false;
    }
  },

  // Get the current user information
  async getCurrentUser(): Promise<JWTTokenPayload | null> {
    try {
      const response = await makeRequest<{ user: JWTTokenPayload }>(
        "/auth/user",
        {
          method: "GET",
        }
      );

      if (!response?.user) {
        throw new AuthError("Invalid user response format");
      }

      // Basic validation of user data
      if (!response.user.sub || !response.user.name) {
        throw new AuthError("Invalid user data received");
      }

      return response.user;
    } catch (error) {
      if (error instanceof AuthError) {
        console.error("Auth error getting user info:", error.message);
      } else {
        console.error("Network error getting user info:", error);
      }
      return null;
    }
  },

  // Refresh the access token using the refresh token
  async refreshToken(): Promise<{
    success: boolean;
    user?: JWTTokenPayload;
    error?: string;
  }> {
    try {
      const response = await makeRequest<{
        success: boolean;
        user: JWTTokenPayload;
      }>("/auth/refresh", {
        method: "POST",
      });

      if (response.success && response.user) {
        // Validate user data before updating cache
        if (!response.user.sub || !response.user.name) {
          throw new AuthError("Invalid user data in refresh response");
        }

        // Update the SWR cache with the fresh user data
        mutate(AUTH_USER_KEY, response.user, { revalidate: false });
        return { success: true, user: response.user };
      }

      return { success: false, error: "Token refresh failed" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Token refresh failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Login with a provider
  async loginWithProvider(provider: AuthProvider): Promise<void> {
    try {
      // Validate provider
      if (!["github", "google"].includes(provider)) {
        throw new AuthError(`Invalid auth provider: ${provider}`);
      }

      const baseUrl = getApiBaseUrl();
      if (!baseUrl) {
        throw new AuthError("API base URL not configured");
      }

      window.location.href = `${baseUrl}/auth/login/${provider}`;
    } catch (error) {
      console.error("Login initiation failed:", error);
      throw error;
    }
  },

  // Logout the user
  async logout(): Promise<void> {
    try {
      await makeRequest<void>("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      // Log but don't throw - logout should always clear local state
      console.error("Logout request failed:", error);
    } finally {
      // Always invalidate cache and redirect regardless of API call success
      try {
        mutate(AUTH_USER_KEY, null, { revalidate: false });
      } catch (mutateError) {
        console.error("Failed to clear auth cache:", mutateError);
      }
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
      // Log but don't throw - logout should always clear local state
      console.error("Logout all sessions failed:", error);
    } finally {
      // Always invalidate cache and redirect regardless of API call success
      try {
        mutate(AUTH_USER_KEY, null, { revalidate: false });
      } catch (mutateError) {
        console.error("Failed to clear auth cache:", mutateError);
      }
      window.location.href = "/";
    }
  },
} as const;
