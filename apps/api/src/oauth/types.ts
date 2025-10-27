/**
 * Shared OAuth types and interfaces
 */

/**
 * OAuth state parameter structure
 */
export interface OAuthState {
  organizationId: string;
  provider: string;
  timestamp: number;
  nonce: string;
}

/**
 * Result of OAuth state validation
 */
export interface ValidatedState {
  organizationId: string;
  orgHandle: string;
  state: OAuthState;
}

/**
 * Generic OAuth token response
 */
export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

/**
 * Generic OAuth user information
 */
export interface OAuthUser {
  id?: string | number;
  email?: string;
  name?: string;
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
 * Google OAuth token response
 */
export interface GoogleToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Google user information
 */
export interface GoogleUser {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  locale?: string;
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
