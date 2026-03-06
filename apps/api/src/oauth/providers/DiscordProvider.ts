import { OAuthProvider } from "../OAuthProvider";
import type { DiscordToken, DiscordUser } from "../types";

// Bot permissions: VIEW_CHANNEL (1024) | SEND_MESSAGES (2048) | READ_MESSAGE_HISTORY (65536)
const BOT_PERMISSIONS = "68608";

export class DiscordProvider extends OAuthProvider<DiscordToken, DiscordUser> {
  readonly name = "discord";
  readonly displayName = "Discord";
  readonly authorizationEndpoint = "https://discord.com/oauth2/authorize";
  readonly tokenEndpoint = "https://discord.com/api/oauth2/token";
  readonly userInfoEndpoint = "https://discord.com/api/users/@me";
  readonly scopes = ["identify", "email", "guilds", "bot"];

  // Token refresh configuration
  readonly refreshEnabled = true;
  readonly refreshEndpoint = "https://discord.com/api/oauth2/token";

  protected customizeAuthUrl(url: URL): void {
    // Request bot permissions so the bot is added to the user's guild
    url.searchParams.set("permissions", BOT_PERMISSIONS);
  }

  // Required implementations
  protected formatIntegrationName(user: DiscordUser): string {
    return user.username || user.global_name || "User";
  }

  protected formatUserMetadata(user: DiscordUser): Record<string, string> {
    return {
      username: user.username,
      globalName: user.global_name ?? "",
      discriminator: user.discriminator,
      avatar: user.avatar ?? "",
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
