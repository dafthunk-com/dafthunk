import type { JsonArray, JsonObject, JsonValue } from "@dafthunk/types";

/**
 * Typed access primitives for walking parsed JSON.
 *
 * JSON nodes navigate values whose shape is only known at runtime. These
 * guards and accessors keep that traversal inside the `JsonValue` union
 * instead of falling back to `any`, so a path that runs off the end of the
 * data yields `undefined` rather than a thrown TypeError.
 */

/** True for JSON objects — not arrays and not null. */
export function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for JSON arrays. */
export function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value);
}

/**
 * Reads one key from a JSON container. Returns undefined when the value is
 * not a container, or when the key is absent.
 */
export function readKey(value: JsonValue, key: string | number): JsonValue {
  if (isJsonArray(value)) {
    const index = typeof key === "number" ? key : Number.parseInt(key, 10);
    return Number.isNaN(index) ? undefined : value[index];
  }
  if (isJsonObject(value)) return value[String(key)];
  return undefined;
}

/**
 * Writes one key on a JSON container. Returns false when the value is not a
 * container, leaving it untouched.
 */
export function writeKey(
  container: JsonValue,
  key: string | number,
  value: JsonValue
): boolean {
  if (isJsonArray(container)) {
    const index = typeof key === "number" ? key : Number.parseInt(key, 10);
    if (Number.isNaN(index)) return false;
    container[index] = value;
    return true;
  }
  if (isJsonObject(container)) {
    container[String(key)] = value;
    return true;
  }
  return false;
}

/** True when `key` is present on a JSON container. */
export function hasKey(value: JsonValue, key: string | number): boolean {
  if (isJsonArray(value)) {
    const index = typeof key === "number" ? key : Number.parseInt(key, 10);
    return !Number.isNaN(index) && index >= 0 && index < value.length;
  }
  if (isJsonObject(value)) return String(key) in value;
  return false;
}

/** Splits a `$.a.b[0]` style path into its segments, dropping the `$` root. */
export function splitPath(path: string): string[] {
  return path
    .replace(/^\$\.?/, "")
    .split(".")
    .filter(Boolean);
}

/**
 * Resolves a `$.a.b[0]` style path against a JSON value. Returns undefined as
 * soon as a segment is missing or lands on a non-container.
 */
export function getAtPath(value: JsonValue, path: string): JsonValue {
  if (!path || path === "$") return value;

  let current = value;
  for (const part of splitPath(path)) {
    if (current === null || current === undefined) return undefined;

    // `key[0]` reads the key, then indexes into the array it holds.
    const arrayAccess = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayAccess) {
      const [, key, index] = arrayAccess;
      const container = readKey(current, key);
      if (!isJsonArray(container)) return undefined;
      current = container[Number.parseInt(index, 10)];
      continue;
    }
    current = readKey(current, part);
  }
  return current;
}

/** True when `path` resolves to a value that is present (may be null). */
export function hasPath(value: JsonValue, path: string): boolean {
  if (!path || path === "$") return value !== undefined;

  let current = value;
  const parts = splitPath(path);
  for (let i = 0; i < parts.length; i++) {
    if (current === null || current === undefined) return false;

    const part = parts[i];
    const arrayAccess = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayAccess) {
      const [, key, index] = arrayAccess;
      const container = readKey(current, key);
      if (!isJsonArray(container)) return false;
      const idx = Number.parseInt(index, 10);
      if (idx >= container.length) return false;
      current = container[idx];
      continue;
    }
    if (!hasKey(current, part)) return false;
    current = readKey(current, part);
  }
  return true;
}

/** Structural equality over JSON values. */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) return false;

  if (isJsonArray(a)) {
    if (!isJsonArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isJsonObject(a)) {
    if (!isJsonObject(b)) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
}

/** Deep copy of a JSON value. */
export function deepClone<T extends JsonValue>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as T;
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = deepClone(item);
  }
  return result as T;
}
