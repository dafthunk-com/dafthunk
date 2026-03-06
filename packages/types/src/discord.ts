// Discord Trigger Types

export interface DiscordMessage {
  guildId: string;
  channelId: string;
  messageId: string;
  content: string;
  author: { id: string; username: string; bot: boolean };
  timestamp: string;
}

export interface GetDiscordTriggerResponse {
  workflowId: string;
  guildId: string;
  channelId: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertDiscordTriggerRequest {
  guildId: string;
  channelId?: string | null;
  active?: boolean;
}

export type UpsertDiscordTriggerResponse = GetDiscordTriggerResponse;

export interface DeleteDiscordTriggerResponse {
  workflowId: string;
}
