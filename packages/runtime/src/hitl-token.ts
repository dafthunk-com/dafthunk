/**
 * HITL Token Utilities
 *
 * Creates and verifies signed tokens for human-in-the-loop form URLs.
 * Tokens encode form configuration and routing information, signed with
 * HMAC-SHA256 to prevent tampering. This makes form config stateless —
 * no database or DO storage needed for the form definition itself.
 */

/** Decoded payload from a signed HITL token */
export interface HitlTokenPayload {
  /** Workflow execution instance ID (routes to EXECUTE DO) */
  eid: string;
  /** Workflow ID (routes to WorkflowAgent DO) */
  wid: string;
  /** Random nonce — event type is `hitl-response-{tok}` */
  tok: string;
  /** Form prompt text */
  p: string;
  /** Optional context text */
  c?: string;
  /** Input type: "text" | "approve" | "json" */
  t: string;
}

function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
 * Create a signed HITL token from a payload.
 * Format: base64url(json) + "." + base64url(hmac-sha256)
 */
export async function createHitlToken(
  payload: HitlTokenPayload,
  signingKey: string
): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadEncoded = base64urlEncode(new TextEncoder().encode(json));
  const signature = await hmacSign(payloadEncoded, signingKey);
  return payloadEncoded + "." + base64urlEncode(signature);
}

/**
 * Verify and decode a signed HITL token.
 * Returns the payload if valid, null if tampered or malformed.
 */
export async function verifyHitlToken(
  token: string,
  signingKey: string
): Promise<HitlTokenPayload | null> {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadEncoded = token.slice(0, dotIndex);
  const signatureEncoded = token.slice(dotIndex + 1);

  try {
    const signature = base64urlDecode(signatureEncoded);
    const valid = await hmacVerify(payloadEncoded, signature, signingKey);
    if (!valid) return null;

    const json = new TextDecoder().decode(base64urlDecode(payloadEncoded));
    const payload = JSON.parse(json) as HitlTokenPayload;

    // Validate required fields
    if (!payload.eid || !payload.wid || !payload.tok || !payload.p || !payload.t) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
