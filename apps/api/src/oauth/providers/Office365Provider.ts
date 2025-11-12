import { OAuthProvider } from "../OAuthProvider";
import type { Office365Token, Office365User } from "../types";

export class Office365Provider extends OAuthProvider<
  Office365Token,
  Office365User
> {
  readonly name = "office-365";
  readonly displayName = "Office 365";
  readonly authorizationEndpoint =
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
  readonly tokenEndpoint =
    "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  readonly userInfoEndpoint = "https://graph.microsoft.com/v1.0/me";
  readonly scopes = [
    "User.Read",
    "offline_access",
    "Mail.Read",
    "Calendars.Read",
    "Files.Read",
  ];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint =
    "https://login.microsoftonline.com/common/oauth2/v2.0/token";

  // Microsoft-specific authorization parameters
  protected customizeAuthUrl(url: URL): void {
    url.searchParams.set("response_mode", "query");
  }

  // Required implementations
  protected formatIntegrationName(user: Office365User): string {
    return user.displayName || user.mail || user.userPrincipalName;
  }

  protected formatUserMetadata(user: Office365User): Record<string, any> {
    return {
      userId: user.id,
      userPrincipalName: user.userPrincipalName,
      displayName: user.displayName,
      mail: user.mail,
      givenName: user.givenName,
      surname: user.surname,
    };
  }

  protected extractAccessToken(token: Office365Token): string {
    return token.access_token;
  }

  protected extractRefreshToken(token: Office365Token): string | undefined {
    return token.refresh_token;
  }

  protected extractExpiresAt(token: Office365Token): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
