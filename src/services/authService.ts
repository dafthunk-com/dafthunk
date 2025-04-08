import { API_BASE_URL } from "@/config/api";

export interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
  plan?: string;
  role?: string;
  avatarUrl?: string;
}

export interface TokenInfo {
  expiresIn: number;
  issuedAt: number;
  expiresAt: number;
}

export interface RenewalResponse {
  message: string;
  renewed: boolean;
  tokenInfo: TokenInfo;
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
  async loginWithProvider(provider: "github"): Promise<void> {
    try {
      // Fetch the authorization URL from the server
      const response = await fetch(
        `${API_BASE_URL}/auth/login?provider=${provider}`,
        {
          method: "GET",
          credentials: "include", // Important for cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Redirect to the authorization URL returned by the server
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          console.error("No authorization URL returned from server");
        }
      } else {
        console.error(
          "Failed to get authorization URL:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("Login initialization failed:", error);
    }
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

  // Renew the authentication token
  async renewToken(): Promise<RenewalResponse | null> {
    try {
      console.log("Calling renewal endpoint at", new Date().toISOString());
      const response = await fetch(`${API_BASE_URL}/auth/renewal`, {
        method: "GET",
        credentials: "include", // Important for cookies
      });

      console.log("Renewal endpoint response status:", response.status);

      if (response.ok) {
        const data = (await response.json()) as RenewalResponse;
        console.log("Renewal endpoint response data:", JSON.stringify(data));
        return data;
      }

      console.error("Renewal failed with status:", response.status);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return null;
    } catch (error) {
      console.error("Token renewal failed:", error);
      return null;
    }
  },
};
