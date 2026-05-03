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
  orgId: string;
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
 * X OAuth token response
 */
export interface XToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * X user information (from /2/users/me)
 */
export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
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
 * WordPress.com OAuth token response
 *
 * WordPress.com tokens do not expire and have no refresh token.
 * `blog_id` and `blog_url` are present when the token is bound to a single site
 * (i.e. when the user picks a site during the OAuth grant); when `scope=global`
 * is requested they are absent and the user's sites must be discovered via /me/sites.
 */
export interface WordPressToken {
  access_token: string;
  token_type: string;
  blog_id?: string | number;
  blog_url?: string;
  scope?: string;
}

/**
 * WordPress.com user information from /rest/v1.1/me
 */
export interface WordPressUser {
  ID: number;
  username: string;
  display_name?: string;
  email?: string;
  primary_blog?: number;
  primary_blog_url?: string;
  avatar_URL?: string;
}
