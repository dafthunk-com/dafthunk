/**
 * Unit tests for encryption utilities
 */

import { beforeEach, describe, expect, it } from "vitest";

import { Bindings } from "../context";
import { decryptSecret, encryptSecret } from "./encryption";

// Mock Bindings for testing
const createMockEnv = (masterKey?: string): Bindings => ({
  SECRET_MASTER_KEY:
    masterKey !== undefined
      ? masterKey
      : "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  // Other required bindings (not used in encryption tests)
  DB: {} as D1Database,
  KV: {} as KVNamespace,
  RATE_LIMIT_DEFAULT: {} as RateLimit,
  RATE_LIMIT_AUTH: {} as RateLimit,
  RATE_LIMIT_EXECUTE: {} as RateLimit,
  EXECUTE: {} as Workflow<any>,
  WORKFLOW_DO: {} as DurableObjectNamespace,
  RESSOURCES: {} as R2Bucket,
  DATASETS: {} as R2Bucket,
  DATASETS_AUTORAG: "",
  AI: {} as Ai,
  BROWSER: {} as Fetcher,
  COMPUTE: {} as AnalyticsEngineDataset,
  WEB_HOST: "",
  EMAIL_DOMAIN: "",
  JWT_SECRET: "",
  CLOUDFLARE_ENV: "",
  CLOUDFLARE_ACCOUNT_ID: "",
  CLOUDFLARE_API_TOKEN: "",
});

describe("Encryption Utilities", () => {
  let mockEnv: Bindings;
  const testOrgId = "org-12345";
  const testSecret = "my-super-secret-password";

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  describe("encryptSecret", () => {
    it("should encrypt a secret successfully", async () => {
      const encrypted = await encryptSecret(testSecret, mockEnv, testOrgId);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(0);
      // Base64 encoded data should not contain the original secret
      expect(encrypted).not.toContain(testSecret);
    });

    it("should produce different encrypted values for the same input (due to random IV)", async () => {
      const encrypted1 = await encryptSecret(testSecret, mockEnv, testOrgId);
      const encrypted2 = await encryptSecret(testSecret, mockEnv, testOrgId);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should produce different encrypted values for different organizations", async () => {
      const org1Encrypted = await encryptSecret(testSecret, mockEnv, "org-1");
      const org2Encrypted = await encryptSecret(testSecret, mockEnv, "org-2");

      expect(org1Encrypted).not.toBe(org2Encrypted);
    });

    it("should handle empty string", async () => {
      const encrypted = await encryptSecret("", mockEnv, testOrgId);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it("should handle unicode characters", async () => {
      const unicodeSecret = "🔐 Secret with émojis and spéciàl chars! 中文";
      const encrypted = await encryptSecret(unicodeSecret, mockEnv, testOrgId);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
    });
  });

  describe("decryptSecret", () => {
    it("should decrypt a secret successfully", async () => {
      const encrypted = await encryptSecret(testSecret, mockEnv, testOrgId);
      const decrypted = await decryptSecret(encrypted, mockEnv, testOrgId);

      expect(decrypted).toBe(testSecret);
    });

    it("should handle empty string encryption/decryption", async () => {
      const encrypted = await encryptSecret("", mockEnv, testOrgId);
      const decrypted = await decryptSecret(encrypted, mockEnv, testOrgId);

      expect(decrypted).toBe("");
    });

    it("should handle unicode characters", async () => {
      const unicodeSecret = "🔐 Secret with émojis and spéciàl chars! 中文";
      const encrypted = await encryptSecret(unicodeSecret, mockEnv, testOrgId);
      const decrypted = await decryptSecret(encrypted, mockEnv, testOrgId);

      expect(decrypted).toBe(unicodeSecret);
    });

    it("should handle large secrets", async () => {
      const largeSecret = "x".repeat(10000); // 10KB secret
      const encrypted = await encryptSecret(largeSecret, mockEnv, testOrgId);
      const decrypted = await decryptSecret(encrypted, mockEnv, testOrgId);

      expect(decrypted).toBe(largeSecret);
    });
  });

  describe("Organization isolation", () => {
    it("should not decrypt with wrong organization ID", async () => {
      const encrypted = await encryptSecret(testSecret, mockEnv, "org-1");

      await expect(
        decryptSecret(encrypted, mockEnv, "org-2")
      ).rejects.toThrow();
    });

    it("should maintain organization isolation consistently", async () => {
      const secret1 = "secret-for-org-1";
      const secret2 = "secret-for-org-2";

      const org1Encrypted = await encryptSecret(secret1, mockEnv, "org-1");
      const org2Encrypted = await encryptSecret(secret2, mockEnv, "org-2");

      const org1Decrypted = await decryptSecret(
        org1Encrypted,
        mockEnv,
        "org-1"
      );
      const org2Decrypted = await decryptSecret(
        org2Encrypted,
        mockEnv,
        "org-2"
      );

      expect(org1Decrypted).toBe(secret1);
      expect(org2Decrypted).toBe(secret2);

      // Cross-organization decryption should fail
      await expect(
        decryptSecret(org1Encrypted, mockEnv, "org-2")
      ).rejects.toThrow();

      await expect(
        decryptSecret(org2Encrypted, mockEnv, "org-1")
      ).rejects.toThrow();
    });
  });

  describe("Error handling - Missing master key", () => {
    it("should throw error when SECRET_MASTER_KEY is missing", async () => {
      const envWithoutKey = createMockEnv("");

      await expect(
        encryptSecret(testSecret, envWithoutKey, testOrgId)
      ).rejects.toThrow("SECRET_MASTER_KEY environment variable not set");
    });

    it("should throw error when SECRET_MASTER_KEY is undefined", async () => {
      const envWithUndefinedKey = {
        ...createMockEnv(),
        SECRET_MASTER_KEY: undefined as any, // Explicitly set to undefined
      };

      await expect(
        encryptSecret(testSecret, envWithUndefinedKey, testOrgId)
      ).rejects.toThrow("SECRET_MASTER_KEY environment variable not set");
    });
  });

  describe("Error handling - Invalid master key format", () => {
    it("should throw error for invalid hex characters", async () => {
      const envWithInvalidKey = createMockEnv(
        "invalid-hex-characters-not-64-chars"
      );

      await expect(
        encryptSecret(testSecret, envWithInvalidKey, testOrgId)
      ).rejects.toThrow();
    });

    it("should throw error for wrong key length (too short)", async () => {
      const envWithShortKey = createMockEnv("abcd1234"); // Only 8 chars instead of 64

      await expect(
        encryptSecret(testSecret, envWithShortKey, testOrgId)
      ).rejects.toThrow(
        "SECRET_MASTER_KEY must be 64 hex characters (32 bytes)"
      );
    });

    it("should throw error for wrong key length (too long)", async () => {
      const envWithLongKey = createMockEnv("a".repeat(128)); // 128 chars instead of 64

      await expect(
        encryptSecret(testSecret, envWithLongKey, testOrgId)
      ).rejects.toThrow(
        "SECRET_MASTER_KEY must be 64 hex characters (32 bytes)"
      );
    });

    it("should throw error for non-hex characters", async () => {
      const envWithNonHex = createMockEnv(
        "gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg"
      ); // 64 'g' chars (invalid hex)

      await expect(
        encryptSecret(testSecret, envWithNonHex, testOrgId)
      ).rejects.toThrow();
    });
  });

  describe("Error handling - Invalid encrypted data", () => {
    it("should throw error for invalid base64", async () => {
      await expect(
        decryptSecret("invalid-base64-@#$%", mockEnv, testOrgId)
      ).rejects.toThrow();
    });

    it("should throw error for truncated encrypted data", async () => {
      const encrypted = await encryptSecret(testSecret, mockEnv, testOrgId);
      const truncated = encrypted.substring(0, 10); // Truncate the encrypted data

      await expect(
        decryptSecret(truncated, mockEnv, testOrgId)
      ).rejects.toThrow();
    });

    it("should throw error for tampered encrypted data", async () => {
      const encrypted = await encryptSecret(testSecret, mockEnv, testOrgId);
      // Tamper with the data by changing a character
      const tampered = encrypted.substring(0, encrypted.length - 1) + "X";

      await expect(
        decryptSecret(tampered, mockEnv, testOrgId)
      ).rejects.toThrow();
    });

    it("should throw error for empty encrypted data", async () => {
      await expect(decryptSecret("", mockEnv, testOrgId)).rejects.toThrow();
    });
  });

  describe("Error handling - Invalid organization ID", () => {
    it("should handle empty organization ID", async () => {
      // Should not throw during encryption
      const encrypted = await encryptSecret(testSecret, mockEnv, "");
      const decrypted = await decryptSecret(encrypted, mockEnv, "");

      expect(decrypted).toBe(testSecret);
    });

    it("should handle very long organization ID", async () => {
      const longOrgId = "org-" + "x".repeat(1000);
      const encrypted = await encryptSecret(testSecret, mockEnv, longOrgId);
      const decrypted = await decryptSecret(encrypted, mockEnv, longOrgId);

      expect(decrypted).toBe(testSecret);
    });

    it("should handle special characters in organization ID", async () => {
      const specialOrgId = "org-with-special-chars!@#$%^&*()";
      const encrypted = await encryptSecret(testSecret, mockEnv, specialOrgId);
      const decrypted = await decryptSecret(encrypted, mockEnv, specialOrgId);

      expect(decrypted).toBe(testSecret);
    });
  });

  describe("Key derivation consistency", () => {
    it("should produce the same derived key for the same organization", async () => {
      const secret1 = "test-secret-1";
      const secret2 = "test-secret-2";

      // Encrypt two different secrets for the same org
      const encrypted1 = await encryptSecret(secret1, mockEnv, testOrgId);
      const encrypted2 = await encryptSecret(secret2, mockEnv, testOrgId);

      // Both should decrypt correctly with the same org ID
      const decrypted1 = await decryptSecret(encrypted1, mockEnv, testOrgId);
      const decrypted2 = await decryptSecret(encrypted2, mockEnv, testOrgId);

      expect(decrypted1).toBe(secret1);
      expect(decrypted2).toBe(secret2);
    });

    it("should produce different keys for different master keys", async () => {
      const env1 = createMockEnv(
        "1111111111111111111111111111111111111111111111111111111111111111"
      );
      const env2 = createMockEnv(
        "2222222222222222222222222222222222222222222222222222222222222222"
      );

      const encrypted1 = await encryptSecret(testSecret, env1, testOrgId);
      const encrypted2 = await encryptSecret(testSecret, env2, testOrgId);

      // Should not be able to decrypt with wrong master key
      await expect(
        decryptSecret(encrypted1, env2, testOrgId)
      ).rejects.toThrow();

      await expect(
        decryptSecret(encrypted2, env1, testOrgId)
      ).rejects.toThrow();
    });
  });
});
