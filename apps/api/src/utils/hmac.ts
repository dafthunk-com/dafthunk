/**
 * Shared HMAC-SHA256 primitive. The imported CryptoKey is memoised per
 * secret string so hot paths (e.g. inbound support email verification) pay
 * the `importKey` cost once per isolate lifetime rather than per call.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();
const encoder = new TextEncoder();

export async function hmacSha256(
  secret: string,
  message: Uint8Array
): Promise<Uint8Array> {
  let keyPromise = keyCache.get(secret);
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    keyCache.set(secret, keyPromise);
  }
  const sig = await crypto.subtle.sign("HMAC", await keyPromise, message);
  return new Uint8Array(sig);
}
