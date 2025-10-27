/**
 * OAuth Helper Utilities
 *
 * Centralized helpers for OAuth flows to reduce duplication and improve type safety
 */

import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { createDatabase, organizations } from "../db";
import type { ApiContext } from "../context";
import type { Bindings } from "../context";

/**
 * OAuth state parameter structure
 */
export interface OAuthState {
  organizationId: string;
  provider: string;
  timestamp: number;
}

/**
 * Result of OAuth state validation
 */
export interface ValidatedOAuthState {
  organizationId: string;
  orgHandle: string;
  state: OAuthState;
}

/**
 * OAuth error with redirect information
 */
export class OAuthError extends Error {
  constructor(
    public readonly redirectError: string,
    message: string
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/**
 * Discord OAuth token response
 */
export interface DiscordToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Discord user information
 */
export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

/**
 * LinkedIn OAuth token response
 */
export interface LinkedInToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

/**
 * LinkedIn user information
 */
export interface LinkedInUser {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

/**
 * Reddit OAuth token response
 */
export interface RedditToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Reddit user information
 */
export interface RedditUser {
  name: string;
  id: string;
  icon_img?: string;
}

/**
 * GitHub OAuth token response
 */
export interface GitHubToken {
  access_token: string;
  token_type: string;
  scope: string;
}

/**
 * GitHub user information
 */
export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

/**
 * Create OAuth state parameter
 */
export function createOAuthState(
  organizationId: string,
  provider: string
): string {
  const state: OAuthState = {
    organizationId,
    provider,
    timestamp: Date.now(),
  };
  return btoa(JSON.stringify(state));
}

/**
 * Parse and validate OAuth state parameter
 *
 * @throws OAuthError if state is invalid or expired
 */
export function parseOAuthState(stateParam: string): OAuthState {
  let state: OAuthState;
  try {
    state = JSON.parse(atob(stateParam));
  } catch {
    throw new OAuthError("invalid_state", "Failed to parse state parameter");
  }

  if (!state.organizationId || !state.provider || !state.timestamp) {
    throw new OAuthError("invalid_state", "State parameter is malformed");
  }

  // Validate state is recent (within 15 minutes)
  const stateAge = Date.now() - state.timestamp;
  if (stateAge > 15 * 60 * 1000) {
    throw new OAuthError("expired_state", "OAuth state has expired");
  }

  return state;
}

/**
 * Validate OAuth state and get organization information
 *
 * @throws OAuthError if state is invalid or organization not found
 */
export async function validateOAuthState(
  c: Context<ApiContext>,
  stateParam: string
): Promise<ValidatedOAuthState> {
  const state = parseOAuthState(stateParam);

  // Get organization handle from database
  const db = createDatabase(c.env.DB);
  const org = await db
    .select({ handle: organizations.handle })
    .from(organizations)
    .where(eq(organizations.id, state.organizationId))
    .get();

  if (!org) {
    throw new OAuthError(
      "organization_not_found",
      `Organization ${state.organizationId} not found`
    );
  }

  return {
    organizationId: state.organizationId,
    orgHandle: org.handle,
    state,
  };
}

/**
 * Get OAuth redirect URI based on environment
 */
export function getOAuthRedirectUri(
  env: Bindings,
  provider: string
): string {
  const base =
    env.CLOUDFLARE_ENV === "production"
      ? "https://api.dafthunk.com"
      : "http://localhost:3001";
  return `${base}/oauth/${provider}/connect`;
}

/**
 * Handle OAuth error and return redirect response
 */
export function handleOAuthError(
  error: unknown,
  provider: string,
  webHost: string
): Response {
  if (error instanceof OAuthError) {
    console.error(`${provider} OAuth error:`, error.message);
    return Response.redirect(
      `${webHost}/integrations?error=${error.redirectError}`
    );
  }

  console.error(`${provider} OAuth error:`, error);
  return Response.redirect(`${webHost}/integrations?error=oauth_failed`);
}
