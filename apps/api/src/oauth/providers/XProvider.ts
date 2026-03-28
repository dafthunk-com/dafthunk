import type { Context } from "hono";
import type { ApiContext } from "../../context";
import { OAuthProvider } from "../OAuthProvider";
import type { XToken, XUser } from "../types";

/**
 * Generate a random code verifier for PKCE (43-128 chars, URL-safe)
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64 URL encode (no padding, URL-safe chars)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate SHA-256 code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Delimiter used to embed code_verifier in the state parameter.
 * X/Twitter passes state back unchanged in the callback, so the
 * verifier survives the round-trip without needing external storage.
 */
const PKCE_DELIMITER = "~";

export class XProvider extends OAuthProvider<XToken, XUser> {
  readonly name = "x";
  readonly displayName = "X";
  readonly authorizationEndpoint = "https://x.com/i/oauth2/authorize";
  readonly tokenEndpoint = "https://api.x.com/2/oauth2/token";
  readonly userInfoEndpoint =
    "https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,description";
  readonly scopes = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "follows.read",
    "follows.write",
    "like.read",
    "like.write",
    "offline.access",
  ];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://api.x.com/2/oauth2/token";

  /**
   * Override initiateAuth to inject PKCE parameters.
   * Generates a code_verifier, computes the S256 challenge, and embeds
   * the verifier in the state so it can be retrieved on callback.
   */
  async initiateAuth(c: Context<ApiContext>): Promise<string> {
    // Get the base authorization URL (includes signed state)
    const authUrl = await super.initiateAuth(c);
    const url = new URL(authUrl);

    // Generate PKCE pair
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Add PKCE parameters
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    // Embed verifier in state (X returns state unchanged on callback)
    const state = url.searchParams.get("state")!;
    url.searchParams.set("state", `${state}${PKCE_DELIMITER}${codeVerifier}`);

    return url.toString();
  }

  /**
   * Override handleCallback to extract the PKCE code_verifier from state
   * and include it in the token exchange.
   */
  async handleCallback(
    c: Context<ApiContext>,
    code: string,
    stateParam: string
  ): Promise<{ orgId: string }> {
    // Split state to extract code_verifier
    const delimiterIndex = stateParam.lastIndexOf(PKCE_DELIMITER);
    if (delimiterIndex === -1) {
      throw new Error("Missing PKCE code_verifier in state");
    }
    const actualState = stateParam.substring(0, delimiterIndex);
    const codeVerifier = stateParam.substring(delimiterIndex + 1);

    // Validate the original signed state
    const { organizationId, orgId } = await this.validateState(c, actualState);

    // Get credentials
    const { clientId, clientSecret } = this.getClientCredentials(c.env);
    const redirectUri = this.getRedirectUri(c.env);

    // Exchange code for token with PKCE verifier
    const response = await fetch(this.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("X token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const token = (await response.json()) as XToken;

    // Fetch user info
    const user = await this.getUserInfo(token.access_token);

    // Create integration
    await this.createIntegration(organizationId, token, user, c.env);

    return { orgId };
  }

  /**
   * X API v2 wraps user info in a { data: ... } envelope
   */
  protected parseUserResponse(data: { data: XUser }): XUser {
    return data.data;
  }

  protected formatIntegrationName(user: XUser): string {
    return `@${user.username}`;
  }

  protected formatUserMetadata(user: XUser): Record<string, string> {
    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      ...(user.profile_image_url && {
        profileImageUrl: user.profile_image_url,
      }),
      ...(user.description && { description: user.description }),
    };
  }

  extractAccessToken(token: XToken): string {
    return token.access_token;
  }

  extractRefreshToken(token: XToken): string | undefined {
    return token.refresh_token;
  }

  extractExpiresAt(token: XToken): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
