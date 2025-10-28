import { OAuthProvider } from "../OAuthProvider";
import type { LinkedInToken, LinkedInUser } from "../types";

export class LinkedInProvider extends OAuthProvider<
  LinkedInToken,
  LinkedInUser
> {
  readonly name = "linkedin";
  readonly displayName = "LinkedIn";
  readonly authorizationEndpoint =
    "https://www.linkedin.com/oauth/v2/authorization";
  readonly tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";
  readonly userInfoEndpoint = "https://api.linkedin.com/v2/userinfo";
  readonly scopes = ["openid", "profile", "email", "w_member_social"];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";

  // Required implementations
  protected formatIntegrationName(user: LinkedInUser): string {
    return user.name || user.email || "User";
  }

  protected formatUserMetadata(user: LinkedInUser): Record<string, any> {
    return {
      userId: user.sub,
      name: user.name,
      givenName: user.given_name,
      familyName: user.family_name,
      email: user.email,
      picture: user.picture,
    };
  }

  protected extractAccessToken(token: LinkedInToken): string {
    return token.access_token;
  }

  protected extractRefreshToken(token: LinkedInToken): string | undefined {
    return token.refresh_token;
  }

  protected extractExpiresAt(token: LinkedInToken): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
