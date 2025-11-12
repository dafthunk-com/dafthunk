import { OAuthProvider } from "../OAuthProvider";
import type { MicrosoftTeamsToken, MicrosoftTeamsUser } from "../types";

export class MicrosoftTeamsProvider extends OAuthProvider<
  MicrosoftTeamsToken,
  MicrosoftTeamsUser
> {
  readonly name = "microsoft-teams";
  readonly displayName = "Microsoft Teams";
  readonly authorizationEndpoint =
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
  readonly tokenEndpoint =
    "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  readonly userInfoEndpoint = "https://graph.microsoft.com/v1.0/me";
  readonly scopes = [
    "User.Read",
    "Team.ReadBasic.All",
    "Channel.ReadBasic.All",
    "ChannelMessage.Send",
    "Chat.ReadWrite",
    "offline_access",
  ];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint =
    "https://login.microsoftonline.com/common/oauth2/v2.0/token";

  // Microsoft-specific authorization parameters
  protected customizeAuthUrl(url: URL): void {
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("prompt", "consent"); // Force consent screen to show all permissions
  }

  // Required implementations
  protected formatIntegrationName(user: MicrosoftTeamsUser): string {
    return user.displayName || user.mail || user.userPrincipalName;
  }

  protected formatUserMetadata(user: MicrosoftTeamsUser): Record<string, any> {
    return {
      userId: user.id,
      userPrincipalName: user.userPrincipalName,
      displayName: user.displayName,
      mail: user.mail,
      givenName: user.givenName,
      surname: user.surname,
    };
  }

  protected extractAccessToken(token: MicrosoftTeamsToken): string {
    return token.access_token;
  }

  protected extractRefreshToken(
    token: MicrosoftTeamsToken
  ): string | undefined {
    return token.refresh_token;
  }

  protected extractExpiresAt(token: MicrosoftTeamsToken): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
