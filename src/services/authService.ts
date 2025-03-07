import { API_BASE_URL } from "@/config/api";

export interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
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
      console.error("Authentication check failed:", error);
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
  loginWithProvider(provider: "github"): void {
    // Direct navigation to the login endpoint
    window.location.href = `${API_BASE_URL}/auth/login?provider=${provider}`;
  },

  // Logout the user
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include", // Important for cookies
      });
      // Redirect to home page or login page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },
};
