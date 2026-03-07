// Discord Bot Types

export interface CreateDiscordBotRequest {
  name: string;
  botToken: string;
  applicationId: string;
}

export interface CreateDiscordBotResponse {
  id: string;
  name: string;
  handle: string;
  applicationId: string;
  tokenLastFour: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type GetDiscordBotResponse = CreateDiscordBotResponse;

export interface ListDiscordBotsResponse {
  discordBots: GetDiscordBotResponse[];
}

export interface UpdateDiscordBotRequest {
  name?: string;
  botToken?: string;
}

export type UpdateDiscordBotResponse = GetDiscordBotResponse;

export interface DeleteDiscordBotResponse {
  id: string;
}
