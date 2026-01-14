import { OAuthProvider } from "../OAuthProvider";
import type { GoogleToken, GoogleUser } from "../types";

export class GoogleCalendarProvider extends OAuthProvider<
  GoogleToken,
  GoogleUser
> {
  readonly name = "google-calendar";
  readonly displayName = "Google Calendar";
  readonly authorizationEndpoint =
    "https://accounts.google.com/o/oauth2/v2/auth";
  readonly tokenEndpoint = "https://oauth2.googleapis.com/token";
  readonly userInfoEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";
  readonly scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
  ];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://oauth2.googleapis.com/token";

  // Google-specific authorization parameters
  protected customizeAuthUrl(url: URL): void {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  // Required implementations
  protected formatIntegrationName(user: GoogleUser): string {
    return user.email || user.name || user.sub;
  }

  protected formatUserMetadata(user: GoogleUser): Record<string, any> {
    return {
      email: user.email,
      name: user.name,
      picture: user.picture,
    };
  }

  extractAccessToken(token: GoogleToken): string {
    return token.access_token;
  }

  extractRefreshToken(token: GoogleToken): string | undefined {
    return token.refresh_token;
  }

  extractExpiresAt(token: GoogleToken): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
