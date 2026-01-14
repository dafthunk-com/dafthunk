import { OAuthProvider } from "../OAuthProvider";
import type { DiscordToken, DiscordUser } from "../types";

export class DiscordProvider extends OAuthProvider<DiscordToken, DiscordUser> {
  readonly name = "discord";
  readonly displayName = "Discord";
  readonly authorizationEndpoint = "https://discord.com/oauth2/authorize";
  readonly tokenEndpoint = "https://discord.com/api/oauth2/token";
  readonly userInfoEndpoint = "https://discord.com/api/users/@me";
  readonly scopes = ["identify", "email", "guilds"];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://discord.com/api/oauth2/token";

  // Required implementations
  protected formatIntegrationName(user: DiscordUser): string {
    return user.username || user.global_name || "User";
  }

  protected formatUserMetadata(user: DiscordUser): Record<string, any> {
    return {
      username: user.username,
      globalName: user.global_name,
      discriminator: user.discriminator,
      avatar: user.avatar,
      userId: user.id,
    };
  }

  extractAccessToken(token: DiscordToken): string {
    return token.access_token;
  }

  extractRefreshToken(token: DiscordToken): string {
    return token.refresh_token;
  }

  extractExpiresAt(token: DiscordToken): Date {
    return new Date(Date.now() + token.expires_in * 1000);
  }
}
