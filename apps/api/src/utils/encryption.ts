/**
 * Encryption utilities for secrets management
 * Uses AES-256-GCM with per-organization key derivation
 */

import { Bindings } from "../context";

/**
 * Get the master encryption key from environment
 */
async function getMasterKey(env: Bindings): Promise<CryptoKey> {
  const masterKeyHex = env.SECRET_MASTER_KEY;
  if (!masterKeyHex) {
    throw new Error('SECRET_MASTER_KEY environment variable not set');
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]{64}$/.test(masterKeyHex)) {
    throw new Error('SECRET_MASTER_KEY must be 64 hex characters (32 bytes)');
  }

  // Convert hex string to Uint8Array
  const keyData = new Uint8Array(
    masterKeyHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
  );

  if (keyData.length !== 32) {
    throw new Error('SECRET_MASTER_KEY must be 64 hex characters (32 bytes)');
  }

  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HKDF' },
    false,
    ['deriveBits', 'deriveKey']
  );
}

/**
 * Derive organization-specific encryption key from master key
 */
async function getOrganizationKey(
  env: Bindings,
  organizationId: string
): Promise<CryptoKey> {
  const masterKey = await getMasterKey(env);
  
  // Use HKDF to derive organization-specific key
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('dafthunk-secrets-v1'), // Domain separator
      info: new TextEncoder().encode(`org:${organizationId}:secrets`), // More specific context
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a secret value using organization-specific key
 */
export async function encryptSecret(
  plaintext: string,
  env: Bindings,
  organizationId: string
): Promise<string> {
  const key = await getOrganizationKey(env, organizationId);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a secret value using organization-specific key
 */
export async function decryptSecret(
  encryptedData: string,
  env: Bindings,
  organizationId: string
): Promise<string> {
  const key = await getOrganizationKey(env, organizationId);
  
  // Decode base64 and extract IV + encrypted data
  const combined = new Uint8Array(
    atob(encryptedData)
      .split('')
      .map(char => char.charCodeAt(0))
  );

  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
