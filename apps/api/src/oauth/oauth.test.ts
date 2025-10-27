import { describe, expect, it } from "vitest";

import {
  getAllProviders,
  getProvider,
  isValidProvider,
  OAuthError,
} from "./index";

describe("OAuth Module", () => {
  describe("Provider Registry", () => {
    it("should return provider for valid provider names", () => {
      expect(getProvider("google-mail")).toBeDefined();
      expect(getProvider("google-calendar")).toBeDefined();
      expect(getProvider("discord")).toBeDefined();
      expect(getProvider("linkedin")).toBeDefined();
      expect(getProvider("reddit")).toBeDefined();
      expect(getProvider("github")).toBeDefined();
    });

    it("should throw error for unknown provider", () => {
      expect(() => getProvider("unknown")).toThrow("Unknown OAuth provider");
    });

    it("should validate provider names", () => {
      expect(isValidProvider("google-mail")).toBe(true);
      expect(isValidProvider("discord")).toBe(true);
      expect(isValidProvider("unknown")).toBe(false);
    });

    it("should return all providers", () => {
      const providers = getAllProviders();
      expect(providers).toHaveLength(6);
    });
  });

  describe("Provider Configuration", () => {
    it("should have correct refresh configuration for Google providers", () => {
      const googleMail = getProvider("google-mail");
      const googleCalendar = getProvider("google-calendar");

      expect(googleMail.refreshEnabled).toBe(true);
      expect(googleCalendar.refreshEnabled).toBe(true);
    });

    it("should have correct refresh configuration for Discord", () => {
      const discord = getProvider("discord");
      expect(discord.refreshEnabled).toBe(true);
    });

    it("should have correct refresh configuration for LinkedIn", () => {
      const linkedin = getProvider("linkedin");
      expect(linkedin.refreshEnabled).toBe(true);
    });

    it("should have correct refresh configuration for Reddit", () => {
      const reddit = getProvider("reddit");
      expect(reddit.refreshEnabled).toBe(true);
    });

    it("should have correct refresh configuration for GitHub", () => {
      const github = getProvider("github");
      expect(github.refreshEnabled).toBe(false);
    });
  });

  describe("Token Refresh Logic", () => {
    it("should determine when token needs refresh", () => {
      const provider = getProvider("google-mail");

      // No expiration date - no refresh needed
      expect(provider.needsRefresh(undefined)).toBe(false);

      // Token expires in 3 minutes (within 5 minute buffer) - needs refresh
      const soonExpiry = new Date(Date.now() + 3 * 60 * 1000);
      expect(provider.needsRefresh(soonExpiry)).toBe(true);

      // Token expires in 10 minutes (beyond 5 minute buffer) - no refresh
      const laterExpiry = new Date(Date.now() + 10 * 60 * 1000);
      expect(provider.needsRefresh(laterExpiry)).toBe(false);

      // Token already expired - needs refresh
      const pastExpiry = new Date(Date.now() - 1 * 60 * 1000);
      expect(provider.needsRefresh(pastExpiry)).toBe(true);
    });

    it("should respect custom buffer period", () => {
      const provider = getProvider("google-mail");

      // Token expires in 8 minutes
      const expiresAt = new Date(Date.now() + 8 * 60 * 1000);

      // With default 5 minute buffer - no refresh
      expect(provider.needsRefresh(expiresAt)).toBe(false);

      // With 10 minute buffer - needs refresh
      expect(provider.needsRefresh(expiresAt, 10)).toBe(true);
    });

    it("should throw error when refreshing GitHub tokens", async () => {
      const github = getProvider("github");

      await expect(
        github.refreshToken("test-token", "client-id", "client-secret")
      ).rejects.toThrow("doesn't support token refresh");
    });
  });

  describe("OAuthError", () => {
    it("should create error with redirect error code", () => {
      const error = new OAuthError("oauth_failed", "Authentication failed");
      expect(error.message).toBe("Authentication failed");
      expect(error.redirectError).toBe("oauth_failed");
      expect(error.name).toBe("OAuthError");
    });

    it("should be instance of Error", () => {
      const error = new OAuthError("oauth_failed", "Authentication failed");
      expect(error instanceof Error).toBe(true);
    });
  });
});
