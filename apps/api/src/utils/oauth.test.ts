import { describe, expect, it } from "vitest";
import {
  refreshOAuthToken,
  shouldRefreshToken,
  supportsTokenRefresh,
  TokenRefreshError,
} from "./oauth";

describe("OAuth Utilities", () => {
  describe("supportsTokenRefresh", () => {
    it("should return true for providers with token expiration", () => {
      expect(supportsTokenRefresh("google-mail")).toBe(true);
      expect(supportsTokenRefresh("google-calendar")).toBe(true);
      expect(supportsTokenRefresh("discord")).toBe(true);
      expect(supportsTokenRefresh("reddit")).toBe(true);
      expect(supportsTokenRefresh("linkedin")).toBe(true);
    });

    it("should return false for GitHub (tokens don't expire)", () => {
      expect(supportsTokenRefresh("github")).toBe(false);
    });

    it("should return false for unknown provider", () => {
      expect(supportsTokenRefresh("unknown")).toBe(false);
    });
  });

  describe("shouldRefreshToken", () => {
    it("should return false when no expiration date provided", () => {
      expect(shouldRefreshToken(null)).toBe(false);
      expect(shouldRefreshToken(undefined)).toBe(false);
    });

    it("should return true when token expires within buffer period", () => {
      // Token expires in 3 minutes (within 5 minute buffer)
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
      expect(shouldRefreshToken(expiresAt)).toBe(true);
    });

    it("should return false when token expires after buffer period", () => {
      // Token expires in 10 minutes (beyond 5 minute buffer)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      expect(shouldRefreshToken(expiresAt)).toBe(false);
    });

    it("should return true when token is already expired", () => {
      // Token expired 1 minute ago
      const expiresAt = new Date(Date.now() - 1 * 60 * 1000);
      expect(shouldRefreshToken(expiresAt)).toBe(true);
    });

    it("should respect custom buffer period", () => {
      // Token expires in 8 minutes
      const expiresAt = new Date(Date.now() + 8 * 60 * 1000);

      // Should return false with 5 minute buffer
      expect(shouldRefreshToken(expiresAt, 5)).toBe(false);

      // Should return true with 10 minute buffer
      expect(shouldRefreshToken(expiresAt, 10)).toBe(true);
    });
  });

  describe("TokenRefreshError", () => {
    it("should create error with provider name in message", () => {
      const error = new TokenRefreshError("google-mail", "Token invalid");
      expect(error.message).toContain("google-mail");
      expect(error.message).toContain("Token invalid");
      expect(error.name).toBe("TokenRefreshError");
      expect(error.provider).toBe("google-mail");
    });

    it("should include status code and response body", () => {
      const error = new TokenRefreshError(
        "discord",
        "Invalid token",
        401,
        '{"error":"invalid_grant"}'
      );
      expect(error.statusCode).toBe(401);
      expect(error.responseBody).toBe('{"error":"invalid_grant"}');
    });
  });

  describe("refreshOAuthToken", () => {
    it("should throw error for unknown provider", async () => {
      const mockEnv = {} as any;
      await expect(
        refreshOAuthToken("unknown", "test-token", mockEnv)
      ).rejects.toThrow(TokenRefreshError);
      await expect(
        refreshOAuthToken("unknown", "test-token", mockEnv)
      ).rejects.toThrow("Unknown provider");
    });

    it("should throw error for GitHub (no refresh support)", async () => {
      const mockEnv = {
        INTEGRATION_GITHUB_CLIENT_ID: "test",
        INTEGRATION_GITHUB_CLIENT_SECRET: "test",
      } as any;

      await expect(
        refreshOAuthToken("github", "test-token", mockEnv)
      ).rejects.toThrow(TokenRefreshError);
      await expect(
        refreshOAuthToken("github", "test-token", mockEnv)
      ).rejects.toThrow("does not support token refresh");
    });
  });
});
