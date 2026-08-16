import { OAuthProvider } from "../OAuthProvider";
import type { InstagramToken, InstagramUser } from "../types";
import { OAuthError } from "../types";

/**
 * Instagram provider using the "Instagram API with Instagram Login" flow
 * (professional accounts, no Facebook Page required).
 *
 * Two departures from standard OAuth:
 * - The code exchange yields a 1-hour token that must immediately be traded
 *   for a ~60-day long-lived token via graph.instagram.com.
 * - There is no refresh token: a long-lived token is renewed by presenting
 *   the token itself, so the access token doubles as the stored refresh token.
 */
export class InstagramProvider extends OAuthProvider<
  InstagramToken,
  InstagramUser
> {
  readonly name = "instagram";
  readonly displayName = "Instagram";
  readonly authorizationEndpoint = "https://www.instagram.com/oauth/authorize";
  readonly tokenEndpoint = "https://api.instagram.com/oauth/access_token";
  readonly userInfoEndpoint =
    "https://graph.instagram.com/me?fields=user_id,username,name,account_type,profile_picture_url";
  readonly scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_comments",
  ];

  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://graph.instagram.com/refresh_access_token";
  // Renewal only works while the token is still valid, and only workflow runs
  // trigger it — a wide buffer means any run in the final week renews the
  // 60-day token instead of gambling on one landing in the last 5 minutes.
  readonly refreshBuffer = 7 * 24 * 60 * 60 * 1000;

  /** Instagram expects comma-separated scopes, not the OAuth-standard spaces. */
  protected customizeAuthUrl(url: URL): void {
    url.searchParams.set("scope", this.scopes.join(","));
  }

  /**
   * Exchange the code for the short-lived token, then immediately trade it
   * for the long-lived one — workflows may run long after the hour is up.
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<InstagramToken> {
    const shortLived = await super.exchangeCodeForToken(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    const url = new URL("https://graph.instagram.com/access_token");
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("access_token", shortLived.access_token);

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Instagram long-lived token exchange failed:", errorText);
      throw new OAuthError("token_exchange_failed", errorText);
    }

    const longLived = this.parseTokenResponse(await response.json());
    // user_id only appears on the code exchange; the publishing endpoints
    // need it, so carry it into the token handed to createIntegration.
    return { ...longLived, user_id: shortLived.user_id };
  }

  /** The code exchange wraps the token in a one-element `data` array. */
  protected parseTokenResponse(data: unknown): InstagramToken {
    const wrapped = data as { data?: InstagramToken[] };
    if (Array.isArray(wrapped.data) && wrapped.data.length > 0) {
      return wrapped.data[0];
    }
    return data as InstagramToken;
  }

  /** Renew a long-lived token by presenting the token itself. */
  async refreshToken(
    refreshToken: string,
    _clientId: string,
    _clientSecret: string
  ): Promise<InstagramToken> {
    const url = new URL(this.refreshEndpoint);
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", refreshToken);

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Instagram token refresh failed:", errorText);
      throw new OAuthError("refresh_failed", errorText);
    }

    return this.parseTokenResponse(await response.json());
  }

  protected formatIntegrationName(user: InstagramUser): string {
    return user.username ? `@${user.username}` : "Instagram";
  }

  protected formatUserMetadata(user: InstagramUser): Record<string, string> {
    return {
      // The professional-account id the content publishing endpoints address.
      userId: String(user.user_id ?? user.id ?? ""),
      username: user.username,
      ...(user.name && { name: user.name }),
      ...(user.account_type && { accountType: user.account_type }),
      ...(user.profile_picture_url && {
        profilePictureUrl: user.profile_picture_url,
      }),
    };
  }

  extractAccessToken(token: InstagramToken): string {
    return token.access_token;
  }

  /** The access token is its own refresh credential. */
  extractRefreshToken(token: InstagramToken): string | undefined {
    return token.access_token;
  }

  extractExpiresAt(token: InstagramToken): Date {
    // Long-lived tokens last ~60 days when the response omits expires_in.
    const seconds = token.expires_in ?? 60 * 24 * 60 * 60;
    return new Date(Date.now() + seconds * 1000);
  }
}
