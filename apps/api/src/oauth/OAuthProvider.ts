/**
 * Unified OAuth Provider Base Class
 *
 * Contains ALL OAuth logic:
 * - State management (create, parse, validate)
 * - OAuth flow (authorize, token exchange, user info)
 * - Token refresh
 * - Integration creation
 *
 * Providers extend this class and provide minimal configuration + customization
 */

import { eq } from "drizzle-orm";
import type { Context } from "hono";

import type { ApiContext } from "../context";
import type { Bindings } from "../context";
import { createDatabase, createIntegration, organizations } from "../db";
import type {
  OAuthState,
  OAuthToken,
  OAuthUser,
  ValidatedState,
} from "./types";
import { OAuthError } from "./types";

export abstract class OAuthProvider<
  TToken extends OAuthToken = OAuthToken,
  TUser extends OAuthUser = OAuthUser,
> {
  // ============================================
  // Configuration (abstract - providers define)
  // ============================================
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly authorizationEndpoint: string;
  abstract readonly tokenEndpoint: string;
  abstract readonly userInfoEndpoint: string;
  abstract readonly scopes: string[];

  // Token refresh configuration
  readonly refreshEnabled: boolean = false;
  readonly refreshEndpoint?: string;
  readonly refreshBuffer: number = 5 * 60 * 1000; // 5 minutes default

  // ============================================
  // STATE MANAGEMENT (built-in, secure by default)
  // ============================================

  /**
   * Create OAuth state parameter with cryptographic nonce
   */
  createState(organizationId: string): string {
    const state: OAuthState = {
      organizationId,
      provider: this.name,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    };
    return btoa(JSON.stringify(state));
  }

  /**
   * Parse and validate OAuth state parameter structure
   * @throws OAuthError if state is invalid or expired
   */
  parseState(stateParam: string): OAuthState {
    let state: OAuthState;
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      throw new OAuthError("invalid_state", "Failed to parse state parameter");
    }

    if (
      !state.organizationId ||
      !state.provider ||
      !state.timestamp ||
      !state.nonce
    ) {
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
   * Security checks:
   * 1. State is well-formed and not expired
   * 2. Organization exists in database
   * 3. Authenticated user belongs to the organization (prevents CSRF)
   *
   * @throws OAuthError if state is invalid, organization not found, or user unauthorized
   */
  async validateState(
    c: Context<ApiContext>,
    stateParam: string
  ): Promise<ValidatedState> {
    const state = this.parseState(stateParam);

    // Get the authenticated user's organization from JWT
    const authenticatedOrgId = c.get("organizationId");

    // Critical security check: Verify JWT organization matches state organization
    // This prevents an attacker from using their own OAuth credentials to create
    // integrations in a victim's organization
    if (state.organizationId !== authenticatedOrgId) {
      throw new OAuthError(
        "unauthorized_organization",
        "Authenticated user does not belong to the organization in OAuth state"
      );
    }

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

  // ============================================
  // OAUTH FLOW (built-in, can override)
  // ============================================

  /**
   * Build OAuth authorization URL
   */
  buildAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    state: string
  ): string {
    const url = new URL(this.authorizationEndpoint);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.scopes.join(" "));
    url.searchParams.set("state", state);

    // Hook for provider-specific params (e.g., Google's access_type=offline)
    this.customizeAuthUrl(url);
    return url.toString();
  }

  /**
   * Customize authorization URL with provider-specific parameters
   * Override in subclass if needed
   */
  protected customizeAuthUrl(_url: URL): void {
    // Default: no customization
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<TToken> {
    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: this.getTokenHeaders(clientId, clientSecret),
      body: this.buildTokenRequestBody(
        code,
        clientId,
        clientSecret,
        redirectUri
      ),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${this.displayName} token exchange failed:`, errorText);
      throw new OAuthError("token_exchange_failed", errorText);
    }

    return this.parseTokenResponse(await response.json());
  }

  /**
   * Get headers for token request
   * Override for providers with special auth (e.g., Reddit's Basic auth)
   */
  protected getTokenHeaders(
    _clientId: string,
    _clientSecret: string
  ): Record<string, string> {
    return { "Content-Type": "application/x-www-form-urlencoded" };
  }

  /**
   * Build token request body
   * Override if provider has different param names
   */
  protected buildTokenRequestBody(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): URLSearchParams {
    return new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
  }

  /**
   * Parse token response from provider
   * Override if provider returns non-standard format
   */
  protected parseTokenResponse(data: any): TToken {
    return data as TToken;
  }

  /**
   * Fetch user information using access token
   */
  async getUserInfo(accessToken: string): Promise<TUser> {
    const response = await fetch(this.userInfoEndpoint, {
      headers: this.getUserInfoHeaders(accessToken),
    });

    if (!response.ok) {
      console.error(`${this.displayName} user info fetch failed`);
      throw new OAuthError("user_fetch_failed", "Failed to fetch user info");
    }

    return this.parseUserResponse(await response.json());
  }

  /**
   * Get headers for user info request
   * Override if provider needs special headers
   */
  protected getUserInfoHeaders(accessToken: string): Record<string, string> {
    return { Authorization: `Bearer ${accessToken}` };
  }

  /**
   * Parse user response from provider
   * Override if provider returns non-standard format
   */
  protected parseUserResponse(data: any): TUser {
    return data as TUser;
  }

  // ============================================
  // TOKEN REFRESH (built-in)
  // ============================================

  /**
   * Refresh an OAuth token
   * @throws OAuthError if provider doesn't support refresh or refresh fails
   */
  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<TToken> {
    if (!this.refreshEnabled || !this.refreshEndpoint) {
      throw new OAuthError(
        "refresh_not_supported",
        `${this.displayName} doesn't support token refresh`
      );
    }

    const response = await fetch(this.refreshEndpoint, {
      method: "POST",
      headers: this.getRefreshHeaders(clientId, clientSecret),
      body: this.buildRefreshRequestBody(refreshToken, clientId, clientSecret),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${this.displayName} token refresh failed:`, errorText);
      throw new OAuthError("refresh_failed", errorText);
    }

    return this.parseTokenResponse(await response.json());
  }

  /**
   * Get headers for refresh request
   * Override for providers with special auth
   */
  protected getRefreshHeaders(
    clientId: string,
    clientSecret: string
  ): Record<string, string> {
    return this.getTokenHeaders(clientId, clientSecret);
  }

  /**
   * Build refresh request body
   * Override if provider has different param names
   */
  protected buildRefreshRequestBody(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): URLSearchParams {
    return new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
  }

  /**
   * Check if token should be refreshed proactively
   * @param expiresAt Token expiration date
   * @param bufferMinutes Optional custom buffer in minutes (default: 5 minutes)
   */
  needsRefresh(
    expiresAt: Date | undefined | null,
    bufferMinutes?: number
  ): boolean {
    if (!expiresAt || !this.refreshEnabled) return false;
    const buffer = bufferMinutes
      ? bufferMinutes * 60 * 1000
      : this.refreshBuffer;
    return expiresAt.getTime() - Date.now() < buffer;
  }

  // ============================================
  // INTEGRATION CREATION (built-in)
  // ============================================

  /**
   * Create integration in database
   */
  async createIntegration(
    organizationId: string,
    token: TToken,
    user: TUser,
    env: Bindings
  ): Promise<void> {
    const db = createDatabase(env.DB);
    const integrationName = this.formatIntegrationName(user);
    const metadata = this.formatUserMetadata(user);

    await createIntegration(
      db,
      organizationId,
      integrationName,
      this.name,
      this.extractAccessToken(token),
      this.extractRefreshToken(token),
      this.extractExpiresAt(token),
      JSON.stringify(metadata),
      env
    );
  }

  // ============================================
  // HIGH-LEVEL OAUTH METHODS (for route handlers)
  // ============================================

  /**
   * Initiate OAuth flow - creates state and returns authorization URL
   * @throws OAuthError if organization context is missing or provider not configured
   */
  async initiateAuth(c: Context<ApiContext>): Promise<string> {
    const organizationId = c.get("organizationId");
    if (!organizationId) {
      throw new OAuthError("not_authenticated", "User is not authenticated");
    }

    const state = this.createState(organizationId);
    const { clientId } = this.getClientCredentials(c.env);
    const redirectUri = this.getRedirectUri(c.env);

    return this.buildAuthorizationUrl(clientId, redirectUri, state);
  }

  /**
   * Handle OAuth callback - validates state, exchanges code, fetches user info, creates integration
   * @returns Organization handle for redirect
   * @throws OAuthError if callback processing fails
   */
  async handleCallback(
    c: Context<ApiContext>,
    code: string,
    stateParam: string
  ): Promise<{ orgHandle: string }> {
    // Validate state (includes CSRF and organization membership checks)
    const { organizationId, orgHandle } = await this.validateState(
      c,
      stateParam
    );

    // Get client credentials
    const { clientId, clientSecret } = this.getClientCredentials(c.env);
    const redirectUri = this.getRedirectUri(c.env);

    // Exchange authorization code for access token
    const token = await this.exchangeCodeForToken(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // Fetch user information
    const user = await this.getUserInfo(this.extractAccessToken(token));

    // Create integration in database
    await this.createIntegration(organizationId, token, user, c.env);

    return { orgHandle };
  }

  // Abstract methods - providers MUST implement
  protected abstract formatIntegrationName(user: TUser): string;
  protected abstract formatUserMetadata(user: TUser): Record<string, any>;
  // Public extract methods - used by ResourceProvider for token refresh
  abstract extractAccessToken(token: TToken): string;
  abstract extractRefreshToken(token: TToken): string | undefined;
  abstract extractExpiresAt(token: TToken): Date | undefined;

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Get OAuth redirect URI based on environment
   */
  getRedirectUri(env: Bindings): string {
    const base =
      env.CLOUDFLARE_ENV === "production"
        ? "https://api.dafthunk.com"
        : "http://localhost:3001";
    return `${base}/oauth/${this.name}/connect`;
  }

  /**
   * Get environment variable name for client ID
   */
  getClientIdEnvVar(): string {
    return `INTEGRATION_${this.name.toUpperCase().replace(/-/g, "_")}_CLIENT_ID`;
  }

  /**
   * Get environment variable name for client secret
   */
  getClientSecretEnvVar(): string {
    return `INTEGRATION_${this.name.toUpperCase().replace(/-/g, "_")}_CLIENT_SECRET`;
  }

  /**
   * Get client credentials from environment
   */
  getClientCredentials(env: Bindings): {
    clientId: string;
    clientSecret: string;
  } {
    const clientId = env[this.getClientIdEnvVar() as keyof Bindings] as string;
    const clientSecret = env[
      this.getClientSecretEnvVar() as keyof Bindings
    ] as string;

    if (!clientId || !clientSecret) {
      throw new OAuthError(
        `${this.name}_not_configured`,
        `${this.displayName} OAuth credentials not configured`
      );
    }

    return { clientId, clientSecret };
  }

  /**
   * Handle errors and return appropriate redirect
   */
  handleError(error: unknown, webHost: string): Response {
    if (error instanceof OAuthError) {
      console.error(`${this.displayName} OAuth error:`, error.message);
      return Response.redirect(
        `${webHost}/integrations?error=${error.redirectError}`
      );
    }
    console.error(`${this.displayName} OAuth error:`, error);
    return Response.redirect(`${webHost}/integrations?error=oauth_failed`);
  }
}
