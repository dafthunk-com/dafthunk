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
