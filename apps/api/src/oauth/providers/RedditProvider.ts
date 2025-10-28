import { OAuthProvider } from "../OAuthProvider";
import type { RedditToken, RedditUser } from "../types";

export class RedditProvider extends OAuthProvider<RedditToken, RedditUser> {
  readonly name = "reddit";
  readonly displayName = "Reddit";
  readonly authorizationEndpoint = "https://www.reddit.com/api/v1/authorize";
  readonly tokenEndpoint = "https://www.reddit.com/api/v1/access_token";
  readonly userInfoEndpoint = "https://oauth.reddit.com/api/v1/me";
  readonly scopes = ["identity", "submit", "read", "vote", "mysubreddits"];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://www.reddit.com/api/v1/access_token";

  // Reddit uses different authorization URL parameter names
  buildAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    state: string
  ): string {
    const url = new URL(this.authorizationEndpoint);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("duration", "permanent");
    url.searchParams.set("scope", this.scopes.join(" "));
    return url.toString();
  }

  // Reddit uses Basic auth for token requests
  protected getTokenHeaders(
    clientId: string,
    clientSecret: string
  ): Record<string, string> {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "web:dafthunk:v1.0.0 (by /u/dafthunk)",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    };
  }

  // Reddit doesn't include client credentials in body for token exchange
  protected buildTokenRequestBody(
    code: string,
    _clientId: string,
    _clientSecret: string,
    redirectUri: string
  ): URLSearchParams {
    return new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
  }

  // Reddit also uses Basic auth for refresh
  protected getRefreshHeaders(
    clientId: string,
    clientSecret: string
  ): Record<string, string> {
    return this.getTokenHeaders(clientId, clientSecret);
  }

  // Reddit doesn't include client credentials in refresh body either
  protected buildRefreshRequestBody(refreshToken: string): URLSearchParams {
    return new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  // Reddit user info needs User-Agent header
  protected getUserInfoHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Dafthunk/1.0",
    };
  }

  // Required implementations
  protected formatIntegrationName(user: RedditUser): string {
    return `u/${user.name}`;
  }

  protected formatUserMetadata(user: RedditUser): Record<string, any> {
    return {
      username: user.name,
      userId: user.id,
      iconImg: user.icon_img,
    };
  }

  protected extractAccessToken(token: RedditToken): string {
    return token.access_token;
  }

  protected extractRefreshToken(token: RedditToken): string {
    return token.refresh_token;
  }

  protected extractExpiresAt(token: RedditToken): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
