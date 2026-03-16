/**
 * Input validation utilities.
 *
 * Centralizes format validation for values interpolated into
 * Analytics Engine SQL queries and other unparameterized contexts.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Assert that a value is a valid UUID. Throws if invalid.
 * Use at system boundaries where user input flows into SQL strings.
 */
export function assertUuid(value: string, label = "value"): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${label} format`);
  }
}

/**
 * Return the value if it's a valid UUID, otherwise undefined.
 * Useful for optional query parameters.
 */
export function parseUuid(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return UUID_REGEX.test(value) ? value : undefined;
}

/**
 * Test whether a string is a valid UUID format.
 */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Format a Date as an Analytics Engine timestamp string.
 *
 * Couples format and validation: the returned string is always safe
 * for interpolation into Analytics Engine SQL queries.
 */
export function toAnalyticsTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}
