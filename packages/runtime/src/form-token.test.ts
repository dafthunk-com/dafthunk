/**
 * Form tokens are the only thing standing between an anonymous HTTP request and
 * resuming a paused workflow, so these tests lean on the rejection paths: a
 * token must be unforgeable, non-replayable past its expiry, and inert when
 * malformed.
 */

import { describe, expect, it, vi } from "vitest";

import {
  createFormToken,
  type FormTokenPayload,
  UNLISTED_LINK_TTL_SECONDS,
  verifyFormToken,
} from "./form-token";

const KEY = "test-signing-key-0123456789";
const OTHER_KEY = "a-different-signing-key-9876";

const payload = (over: Partial<FormTokenPayload> = {}): FormTokenPayload => ({
  eid: "exec-1",
  wid: "wf-1",
  tok: "nonce-1",
  ...over,
});

/** Re-encodes a payload object into the token's base64url payload segment. */
function encodeSegment(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

describe("form tokens", () => {
  describe("round trip", () => {
    it("verifies a token it just issued", async () => {
      const token = await createFormToken(payload(), KEY);
      const decoded = await verifyFormToken(token, KEY);

      expect(decoded).toMatchObject({
        eid: "exec-1",
        wid: "wf-1",
        tok: "nonce-1",
      });
    });

    it("preserves the optional organization claim", async () => {
      const token = await createFormToken(payload({ org: "org-9" }), KEY);
      expect((await verifyFormToken(token, KEY))?.org).toBe("org-9");
    });

    it("stamps a default expiry a week out", async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await createFormToken(payload(), KEY);
      const exp = (await verifyFormToken(token, KEY))?.exp ?? 0;

      expect(exp).toBeGreaterThanOrEqual(before + UNLISTED_LINK_TTL_SECONDS);
      expect(exp).toBeLessThanOrEqual(
        before + UNLISTED_LINK_TTL_SECONDS + 5 // clock drift during the test
      );
    });

    it("honours an explicit ttl", async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await createFormToken(payload(), KEY, 60);
      const exp = (await verifyFormToken(token, KEY))?.exp ?? 0;

      expect(exp).toBeGreaterThanOrEqual(before + 60);
      expect(exp).toBeLessThanOrEqual(before + 65);
    });

    it("produces a two-segment token with no base64 padding", async () => {
      const token = await createFormToken(payload(), KEY);
      expect(token.split(".")).toHaveLength(2);
      expect(token).not.toContain("=");
      expect(token).not.toContain("+");
      expect(token).not.toContain("/");
    });
  });

  describe("forgery and tampering", () => {
    it("rejects a token signed with a different key", async () => {
      const token = await createFormToken(payload(), OTHER_KEY);
      expect(await verifyFormToken(token, KEY)).toBeNull();
    });

    it("rejects a payload swapped for another execution", async () => {
      const token = await createFormToken(payload(), KEY);
      const [, signature] = token.split(".");
      const forged = `${encodeSegment(payload({ eid: "victim-exec" }))}.${signature}`;

      expect(await verifyFormToken(forged, KEY)).toBeNull();
    });

    it("rejects a payload with its expiry pushed out", async () => {
      const token = await createFormToken(payload(), KEY, 60);
      const [, signature] = token.split(".");
      const extended = encodeSegment(
        payload({ exp: Math.floor(Date.now() / 1000) + 999_999 })
      );

      expect(await verifyFormToken(`${extended}.${signature}`, KEY)).toBeNull();
    });

    it("rejects a token whose signature was replaced", async () => {
      const mine = await createFormToken(payload(), KEY);
      const theirs = await createFormToken(payload({ eid: "exec-2" }), KEY);

      const spliced = `${mine.split(".")[0]}.${theirs.split(".")[1]}`;
      expect(await verifyFormToken(spliced, KEY)).toBeNull();
    });

    it("rejects a truncated signature", async () => {
      const token = await createFormToken(payload(), KEY);
      const [head, signature] = token.split(".");

      expect(
        await verifyFormToken(`${head}.${signature.slice(0, -4)}`, KEY)
      ).toBeNull();
    });
  });

  describe("expiry", () => {
    it("rejects a token past its expiry", async () => {
      const token = await createFormToken(
        payload({ exp: Math.floor(Date.now() / 1000) - 1 }),
        KEY
      );
      expect(await verifyFormToken(token, KEY)).toBeNull();
    });

    it("accepts a token expiring this very second", async () => {
      const token = await createFormToken(
        payload({ exp: Math.floor(Date.now() / 1000) }),
        KEY
      );
      expect(await verifyFormToken(token, KEY)).not.toBeNull();
    });

    it("rejects a validly signed token that carries no expiry", async () => {
      // Fail-closed guard: treating a missing `exp` as "never expires" would
      // make any such token eternal. Signed here with the real key so only the
      // missing claim can be what rejects it.
      const unexpiring = { eid: "e", wid: "w", tok: "t" };
      const segment = encodeSegment(unexpiring);
      const reference = await createFormToken(payload(), KEY);
      const signature = (
        await createFormToken({ ...unexpiring, exp: 1 }, KEY, 0)
      ).split(".")[1];

      expect(reference).toBeTruthy();
      expect(await verifyFormToken(`${segment}.${signature}`, KEY)).toBeNull();
    });

    it("rejects a non-numeric expiry", async () => {
      const token = await createFormToken(
        { ...payload(), exp: "9999999999" } as unknown as FormTokenPayload,
        KEY
      );
      expect(await verifyFormToken(token, KEY)).toBeNull();
    });

    it("rejects an infinite expiry", async () => {
      // JSON.stringify turns Infinity into null, which must not read as valid.
      const token = await createFormToken(
        payload({ exp: Number.POSITIVE_INFINITY }),
        KEY
      );
      expect(await verifyFormToken(token, KEY)).toBeNull();
    });
  });

  describe("malformed input", () => {
    it.each([
      ["empty string", ""],
      ["no separator", "no-dot-here"],
      ["empty payload segment", ".c2ln"],
      ["empty signature segment", "cGF5bG9hZA."],
      ["non-base64 payload", "!!!!.c2ln"],
      ["non-base64 signature", "cGF5bG9hZA.!!!!"],
      ["separator only", "."],
    ])("rejects %s", async (_label, token) => {
      expect(await verifyFormToken(token, KEY)).toBeNull();
    });

    it("rejects a signed payload that is not an object", async () => {
      const signature = (await createFormToken(payload(), KEY)).split(".")[1];
      for (const value of ["null", '"a string"', "[]", "42"]) {
        const segment = btoa(value)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        expect(
          await verifyFormToken(`${segment}.${signature}`, KEY)
        ).toBeNull();
      }
    });

    it.each([
      "eid",
      "wid",
      "tok",
    ])("rejects a token missing the %s claim", async (claim) => {
      const incomplete = payload();
      delete (incomplete as Record<string, unknown>)[claim];
      const token = await createFormToken(incomplete, KEY);

      expect(await verifyFormToken(token, KEY)).toBeNull();
    });

    it("rejects routing claims of the wrong type", async () => {
      const token = await createFormToken(
        { eid: 1, wid: 2, tok: 3 } as unknown as FormTokenPayload,
        KEY
      );
      expect(await verifyFormToken(token, KEY)).toBeNull();
    });
  });

  describe("signing key preconditions", () => {
    it.each([
      ["empty", ""],
      ["undefined", undefined],
    ])("refuses to sign with a %s key", async (_label, key) => {
      await expect(
        createFormToken(payload(), key as unknown as string)
      ).rejects.toThrow(/FORM_SIGNING_KEY/);
    });

    it.each([
      ["empty", ""],
      ["undefined", undefined],
    ])("refuses to verify with a %s key", async (_label, key) => {
      const token = await createFormToken(payload(), KEY);

      // Must throw rather than return null: an unconfigured server is an
      // operator problem, not a bad token, and silently returning null would
      // make every form link look merely "invalid".
      await expect(
        verifyFormToken(token, key as unknown as string)
      ).rejects.toThrow(/FORM_SIGNING_KEY/);
    });
  });

  describe("payload handling", () => {
    it("survives unicode in claims", async () => {
      const token = await createFormToken(
        payload({ eid: "exec-café-🔑", tok: "nonce-日本語" }),
        KEY
      );
      const decoded = await verifyFormToken(token, KEY);

      expect(decoded?.eid).toBe("exec-café-🔑");
      expect(decoded?.tok).toBe("nonce-日本語");
    });

    it("issues distinct tokens for distinct nonces", async () => {
      const a = await createFormToken(payload({ tok: "a" }), KEY);
      const b = await createFormToken(payload({ tok: "b" }), KEY);
      expect(a).not.toBe(b);
    });

    it("does not mutate the caller's payload", async () => {
      const original = payload();
      await createFormToken(original, KEY);
      expect(original.exp).toBeUndefined();
    });

    it("rejects a token once the clock passes its expiry", async () => {
      const token = await createFormToken(payload(), KEY, 60);
      expect(await verifyFormToken(token, KEY)).not.toBeNull();

      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 61_000);
      try {
        expect(await verifyFormToken(token, KEY)).toBeNull();
      } finally {
        vi.restoreAllMocks();
      }
    });
  });
});
