import type { ZodError } from "zod";

/**
 * Formats a ZodError into a single human-readable message for
 * `createErrorResult`. Issue messages are written per-field in node input
 * schemas, so the message alone (without the path) reads naturally.
 */
export function zodErrorMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
