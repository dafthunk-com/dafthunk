// Discord Trigger Types

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

export interface GetDiscordTriggerResponse {
  workflowId: string;
  commandName: string;
  commandDescription: string | null;
  discordBotId: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertDiscordTriggerRequest {
  commandName: string;
  commandDescription?: string | null;
  discordBotId: string;
  active?: boolean;
}

export type UpsertDiscordTriggerResponse = GetDiscordTriggerResponse;

export interface SyncDiscordTriggerResponse {
  commandName: string;
  synced: boolean;
}

export interface DeleteDiscordTriggerResponse {
  workflowId: string;
}
