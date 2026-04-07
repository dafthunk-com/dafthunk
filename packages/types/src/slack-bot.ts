// Slack Bot Types

export interface CreateSlackBotRequest {
  name: string;
  botToken: string;
  signingSecret: string;
}

export interface CreateSlackBotResponse {
  id: string;
  name: string;
  appId: string;
  teamId: string;
  teamName: string;
  tokenLastFour: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type GetSlackBotResponse = CreateSlackBotResponse;

export interface ListSlackBotsResponse {
  slackBots: GetSlackBotResponse[];
}

export interface UpdateSlackBotRequest {
  name?: string;
  botToken?: string;
  signingSecret?: string;
}

export type UpdateSlackBotResponse = GetSlackBotResponse;

export interface DeleteSlackBotResponse {
  id: string;
}
