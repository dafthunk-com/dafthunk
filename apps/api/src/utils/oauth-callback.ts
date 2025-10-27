/**
 * OAuth callback helpers for Hono OAuth providers
 */

import { getCookie } from "hono/cookie";
import { jwtVerify } from "jose";
import type { Context } from "hono";
import type { JWTTokenPayload } from "@dafthunk/types";
import type { ApiContext } from "../context";

/**
 * OAuth state embedded in the state parameter
 */
export interface OAuthState {
  organizationId: string;
  provider: string;
  timestamp: number;
}

/**
 * OAuth token from Hono provider
 */
export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

/**
 * Validation result for OAuth callbacks
 */
export interface CallbackValidation {
  organizationId: string;
  orgHandle: string;
  state: OAuthState;
}

/**
 * Error thrown when callback validation fails
 */
export class CallbackValidationError extends Error {
  constructor(
    message: string,
    public readonly redirectError: string
  ) {
    super(message);
    this.name = "CallbackValidationError";
  }
}

/**
 * Validate OAuth callback and extract verified state
 *
 * Checks:
 * 1. Token and user data exist
 * 2. State parameter is valid
 * 3. State is not expired (15 min timeout)
 * 4. User is authenticated via JWT
 * 5. User's organization matches state
 *
 * @throws CallbackValidationError with redirect error code
 */
export async function validateOAuthCallback(
  c: Context<ApiContext>
): Promise<CallbackValidation> {
  const token = c.get("token") as OAuthToken | undefined;
  const stateParam = c.req.query("state");

  // Verify token and state exist
  if (!token || !stateParam) {
    throw new CallbackValidationError(
      "Missing token or state parameter",
      "oauth_failed"
    );
  }

  // Parse and validate state
  let state: OAuthState;
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    throw new CallbackValidationError("Invalid state parameter", "invalid_state");
  }

  if (!state.organizationId || !state.provider || !state.timestamp) {
    throw new CallbackValidationError("Malformed state data", "invalid_state");
  }

  // Check state expiration (15 minutes)
  const stateAge = Date.now() - state.timestamp;
  if (stateAge > 15 * 60 * 1000) {
    throw new CallbackValidationError("OAuth state expired", "expired_state");
  }

  // Verify user authentication
  const accessToken = getCookie(c, "access_token");
  if (!accessToken) {
    throw new CallbackValidationError(
      "User not authenticated",
      "not_authenticated"
    );
  }

  // Verify JWT and extract payload
  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  let payload: JWTTokenPayload;
  try {
    const verified = await jwtVerify(accessToken, secret);
    payload = verified.payload as JWTTokenPayload;
  } catch {
    throw new CallbackValidationError(
      "Invalid authentication token",
      "not_authenticated"
    );
  }

  // Verify organization match
  if (payload.organization.id !== state.organizationId) {
    throw new CallbackValidationError(
      "Organization mismatch",
      "organization_mismatch"
    );
  }

  return {
    organizationId: state.organizationId,
    orgHandle: payload.organization.handle,
    state,
  };
}

/**
 * Create OAuth state parameter
 */
export function createOAuthState(
  organizationId: string,
  provider: string
): string {
  return btoa(
    JSON.stringify({
      organizationId,
      provider,
      timestamp: Date.now(),
    })
  );
}
