/**
 * Tokenized Reply-To addresses for the support inbox.
 *
 * Outbound replies advertise a Reply-To of the form
 * `support+<TOKEN>@<domain>`, where TOKEN is a fixed-width lowercase base32
 * (RFC 4648, no padding) blob that encodes the thread id together with a
 * truncated HMAC-SHA256:
 *
 *   [ 26 chars: base32(threadId, 16 bytes) ][ 16 chars: base32(mac, 10 bytes) ]
 *
 * Inbound mail delivered to that address can therefore be attached to the
 * right thread without trusting the sender's From: address — the token alone
 * authenticates the conversation. Bumping the version prefix below
 * invalidates every outstanding reply address in one step.
 */
import { parse as parseUuid, stringify as stringifyUuid } from "uuid";

import type { Bindings } from "./context";
import { hmacSha256 } from "./utils/hmac";

const TOKEN_VERSION_PREFIX = "support-reply:v1:";
const THREAD_ID_BYTES = 16;
const MAC_BYTES = 10; // 80-bit truncation; ~2^80 online queries to forge.
const THREAD_ID_BASE32_LEN = 26;
const MAC_BASE32_LEN = 16;
export const REPLY_TOKEN_LENGTH = THREAD_ID_BASE32_LEN + MAC_BASE32_LEN;

// RFC 4648 base32, lowercased. SMTP relays case-fold local parts in practice;
// emitting lowercase keeps the round-trip deterministic.
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
const PREFIX_BYTES = new TextEncoder().encode(TOKEN_VERSION_PREFIX);

export async function mintReplyToken(
  threadId: string,
  secret: string
): Promise<string> {
  const threadBytes = parseUuid(threadId);
  const mac = await computeMac(threadBytes, secret);
  return base32Encode(threadBytes) + base32Encode(mac);
}

export async function verifyReplyToken(
  token: string,
  secret: string
): Promise<string | null> {
  if (token.length !== REPLY_TOKEN_LENGTH) return null;
  const lower = token.toLowerCase();
  const threadBytes = base32Decode(lower.slice(0, THREAD_ID_BASE32_LEN));
  const macBytes = base32Decode(lower.slice(THREAD_ID_BASE32_LEN));
  if (!threadBytes || threadBytes.length !== THREAD_ID_BYTES) return null;
  if (!macBytes || macBytes.length !== MAC_BYTES) return null;
  const expected = await computeMac(threadBytes, secret);
  if (!constantTimeEqual(macBytes, expected)) return null;
  return stringifyUuid(threadBytes);
}

/**
 * Compose a tokenized Reply-To address `${handle}+${token}@${domain}` for a
 * thread. Shared by the support inbox and per-org mailboxes — the caller
 * supplies the address parts so the same threading mechanism works for any
 * sending address.
 */
export async function buildReplyAddress(
  threadId: string,
  handle: string,
  domain: string,
  secret: string
): Promise<string> {
  const token = await mintReplyToken(threadId, secret);
  return `${handle.toLowerCase()}+${token}@${domain}`;
}

/**
 * Compose the full Reply-To address for a support thread, or null when any of
 * the required env bindings is missing. The address format is intentionally
 * owned here so the route only needs the thread id.
 */
export async function buildReplyToAddress(
  threadId: string,
  env: Bindings
): Promise<string | null> {
  const handle = env.SUPPORT_EMAIL_HANDLE?.toLowerCase();
  const from = env.SUPPORT_EMAIL_FROM;
  const domain = from?.includes("@") ? from.split("@")[1] : undefined;
  if (!handle || !domain || !env.JWT_SECRET) return null;
  return buildReplyAddress(threadId, handle, domain, env.JWT_SECRET);
}

async function computeMac(
  threadBytes: Uint8Array,
  secret: string
): Promise<Uint8Array> {
  const message = new Uint8Array(PREFIX_BYTES.length + threadBytes.length);
  message.set(PREFIX_BYTES, 0);
  message.set(threadBytes, PREFIX_BYTES.length);
  const sig = await hmacSha256(secret, message);
  return sig.slice(0, MAC_BYTES);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function base32Encode(bytes: Uint8Array): string {
  let result = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(buffer >> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return result;
}

function base32Decode(s: string): Uint8Array | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const value = BASE32_ALPHABET.indexOf(s[i]);
    if (value === -1) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}
