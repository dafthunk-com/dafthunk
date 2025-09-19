/**
 * Script to generate a secure master key for secrets encryption
 * Run this once and store the result securely in your environment variables
 */

// Generate a secure 32-byte (256-bit) key
const keyBytes = new Uint8Array(32);
crypto.getRandomValues(keyBytes);

// Convert to hex string
const masterKey = Array.from(keyBytes)
  .map((byte) => byte.toString(16).padStart(2, "0"))
  .join("");

console.log("Generated master key (store this securely):");
console.log(masterKey);
console.log("");
console.log("Add this to your environment variables as:");
console.log(`SECRET_MASTER_KEY=${masterKey}`);
console.log("");
console.log(
  "⚠️  IMPORTANT: Store this key securely and never commit it to version control!"
);
