import { customAlphabet } from "nanoid";

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SUFFIX_LENGTH = 6;
const MAX_BASE_LENGTH = 32;
const DEFAULT_BASE = "email";

// Unicode combining diacritical marks (U+0300–U+036F); strip after NFD
// normalize so that, e.g., "é" becomes "e".
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
const NON_ALNUM = /[^a-z0-9]+/g;
const TRIM_HYPHENS = /^-+|-+$/g;
const TRAILING_HYPHENS = /-+$/g;

const generateSuffix = customAlphabet(SUFFIX_ALPHABET, SUFFIX_LENGTH);

export function sanitizeBase(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_ALNUM, "-")
    .replace(TRIM_HYPHENS, "")
    .slice(0, MAX_BASE_LENGTH)
    .replace(TRAILING_HYPHENS, "");
  return base || DEFAULT_BASE;
}

export function generateEmailHandle(name: string): string {
  return `${sanitizeBase(name)}-${generateSuffix()}`;
}

export function formatEmailAddress(handle: string, domain: string): string {
  return `${handle}@${domain}`;
}

export function isUniqueHandleError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /UNIQUE constraint failed.*emails\.handle/i.test(msg) ||
    /SQLITE_CONSTRAINT/i.test(msg)
  );
}

const MAX_HANDLE_ATTEMPTS = 5;

/**
 * Runs `attempt` with freshly generated handles until one is unique.
 *
 * The suffix makes collisions unlikely; the retry makes them survivable.
 * Shared by the emails route and the workflow generator, so the two can never
 * disagree about what allocating a mailbox means. Returns undefined once the
 * attempts run out — a failure rare enough to be worth logging, not throwing.
 */
export async function withUniqueHandle<T>(
  name: string,
  attempt: (handle: string) => Promise<T>
): Promise<T | undefined> {
  let lastError: unknown;
  for (let index = 0; index < MAX_HANDLE_ATTEMPTS; index++) {
    try {
      return await attempt(generateEmailHandle(name));
    } catch (err) {
      lastError = err;
      if (!isUniqueHandleError(err)) throw err;
    }
  }
  console.error("Failed to allocate a unique email handle", lastError);
  return undefined;
}
