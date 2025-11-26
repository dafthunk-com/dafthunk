import type { Result } from "./base";

/**
 * Standalone utility functions for testing rename and move operations
 */

export function parseJSON<T>(input: string): Result<T> {
  try {
    const value = JSON.parse(input) as T;
    return { success: true, value };
  } catch {
    return { success: false, error: "Invalid JSON" };
  }
}

export function stringifyJSON(data: unknown): Result<string> {
  try {
    const value = JSON.stringify(data, null, 2);
    return { success: true, value };
  } catch {
    return { success: false, error: "Failed to stringify" };
  }
}

export function validateEmail(email: string): boolean {
  return email.includes("@") && email.includes(".");
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "");
}

export const DEFAULT_TIMEOUT = 5000;

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export interface Config {
  timeout: number;
  retries: number;
  debug?: boolean;
}
