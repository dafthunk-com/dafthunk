// Discord Runtime Types

export interface DiscordInteraction {
  discordBotId: string;
  interactionId: string;
  interactionToken: string;
  applicationId: string;
  commandName: string;
  options: Record<string, string | number | boolean>;
  guildId?: string;
  channelId?: string;
  user: { id: string; username: string; globalName?: string };
}
