/**
 * Form Token Utilities
 *
 * Creates and verifies signed tokens for human-in-the-loop form URLs.
 * Tokens encode routing information, signed with HMAC-SHA256 to prevent
 * tampering. Form content (schema, title) is stored in the WorkflowAgent
 * DO and fetched by the form page at render time.
 */

/** Decoded payload from a signed form token */
export interface FormTokenPayload {
  /** Workflow execution instance ID (routes to EXECUTE DO) */
  eid: string;
  /** Workflow ID (routes to WorkflowAgent DO) */
  wid: string;
  /** Random nonce — event type is `form-response-{tok}` */
  tok: string;
  /** Organization ID — present for feedback-form tokens so anonymous readers can load execution data */
  org?: string;
  /** Expiration timestamp (unix seconds). Set automatically by createFormToken. */
  exp?: number;
}

/** Default token lifetime: 7 days in seconds. Matches the R2 presigned URL max. */
export const UNLISTED_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSign(data: string, secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

async function hmacVerify(
  data: string,
  signature: Uint8Array,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(data)
  );
}

/**
 * Create a signed form token from a payload.
 * Format: base64url(json) + "." + base64url(hmac-sha256)
 *
 * An `exp` (unix seconds) is set automatically from `ttlSeconds` unless the
 * caller already provided one. Verifiers reject tokens past their expiration.
 */
export async function createFormToken(
  payload: FormTokenPayload,
  signingKey: string,
  ttlSeconds: number = UNLISTED_LINK_TTL_SECONDS
): Promise<string> {
  const withExp: FormTokenPayload = {
    ...payload,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const json = JSON.stringify(withExp);
  const payloadEncoded = base64urlEncode(new TextEncoder().encode(json));
  const signature = await hmacSign(payloadEncoded, signingKey);
  return `${payloadEncoded}.${base64urlEncode(signature)}`;
}

/**
 * Verify and decode a signed form token.
 * Returns the payload if valid, null if tampered, malformed, or expired.
 */
export async function verifyFormToken(
  token: string,
  signingKey: string
): Promise<FormTokenPayload | null> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadEncoded = token.slice(0, dotIndex);
  const signatureEncoded = token.slice(dotIndex + 1);

  try {
    const signature = base64urlDecode(signatureEncoded);
    const valid = await hmacVerify(payloadEncoded, signature, signingKey);
    if (!valid) return null;

    const json = new TextDecoder().decode(base64urlDecode(payloadEncoded));
    const payload = JSON.parse(json) as FormTokenPayload;

    if (!payload.eid || !payload.wid || !payload.tok) {
      return null;
    }

    if (
      typeof payload.exp === "number" &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
