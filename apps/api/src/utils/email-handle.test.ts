import { describe, expect, it } from "vitest";

import {
  formatEmailAddress,
  generateEmailHandle,
  isUniqueHandleError,
  sanitizeBase,
} from "./email-handle";

describe("sanitizeBase", () => {
  it("slugifies a typical display name", () => {
    expect(sanitizeBase("Customer Support – Tier 1!")).toBe(
      "customer-support-tier-1"
    );
  });

  it("strips combining marks from accented characters", () => {
    expect(sanitizeBase("café résumé")).toBe("cafe-resume");
    expect(sanitizeBase("Über_Hänsel")).toBe("uber-hansel");
  });

  it("collapses whitespace and trims edges", () => {
    expect(sanitizeBase("  Hello   World  ")).toBe("hello-world");
  });

  it("falls back to default when sanitization yields empty", () => {
    expect(sanitizeBase("!!!---!!!")).toBe("email");
    expect(sanitizeBase("🎉🎊")).toBe("email");
    expect(sanitizeBase("")).toBe("email");
  });

  it("does not block reserved-looking names (the suffix disambiguates)", () => {
    expect(sanitizeBase("Admin")).toBe("admin");
    expect(sanitizeBase("no-reply")).toBe("no-reply");
    expect(sanitizeBase("postmaster")).toBe("postmaster");
  });

  it("truncates to MAX_BASE_LENGTH (32) chars", () => {
    expect(sanitizeBase("a".repeat(100))).toBe("a".repeat(32));
  });

  it("re-trims trailing hyphens after truncation", () => {
    // 33 chars: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-" → truncate to 32
    // ends with "-" → must be re-trimmed.
    const name = `${"a".repeat(32)}-tail`;
    const base = sanitizeBase(name);
    expect(base.endsWith("-")).toBe(false);
    expect(base.length).toBeLessThanOrEqual(32);
  });
});

describe("generateEmailHandle", () => {
  it("appends a 6-char lowercase-alphanumeric suffix", () => {
    const result = generateEmailHandle("Test Email");
    expect(result).toMatch(/^test-email-[a-z0-9]{6}$/);
  });

  it("produces distinct outputs for the same input", () => {
    const a = generateEmailHandle("same");
    const b = generateEmailHandle("same");
    expect(a).not.toBe(b);
    expect(a.startsWith("same-")).toBe(true);
    expect(b.startsWith("same-")).toBe(true);
  });

  it("never produces colliding suffixes across 1000 calls", () => {
    const suffixes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const handle = generateEmailHandle("x");
      const suffix = handle.slice("x-".length);
      suffixes.add(suffix);
    }
    expect(suffixes.size).toBe(1000);
  });

  it("uses the default base for empty-sanitized input", () => {
    expect(generateEmailHandle("🎉🎊")).toMatch(/^email-[a-z0-9]{6}$/);
  });
});

describe("formatEmailAddress", () => {
  it("composes handle and domain", () => {
    expect(formatEmailAddress("cafe-tickets-a7k3p9", "mail.dafthunk.com")).toBe(
      "cafe-tickets-a7k3p9@mail.dafthunk.com"
    );
  });
});

describe("isUniqueHandleError", () => {
  it("recognizes SQLite UNIQUE constraint on emails.handle", () => {
    const err = new Error("D1_ERROR: UNIQUE constraint failed: emails.handle");
    expect(isUniqueHandleError(err)).toBe(true);
  });

  it("recognizes generic SQLITE_CONSTRAINT errors", () => {
    expect(isUniqueHandleError(new Error("SQLITE_CONSTRAINT: ..."))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isUniqueHandleError(new Error("network unreachable"))).toBe(false);
    expect(isUniqueHandleError("just a string")).toBe(false);
  });
});
