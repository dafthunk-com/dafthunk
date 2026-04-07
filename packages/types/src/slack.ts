// Slack Trigger Types

export interface SlackMessage {
  slackBotId: string;
  channelId: string;
  threadTs?: string;
  messageTs: string;
  content: string;
  userId: string;
  username: string;
  timestamp: string;
}

export interface GetSlackTriggerResponse {
  workflowId: string;
  slackBotId: string | null;
  channelId: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertSlackTriggerRequest {
  slackBotId: string;
  channelId?: string | null;
  active?: boolean;
}

export type UpsertSlackTriggerResponse = GetSlackTriggerResponse;

export interface DeleteSlackTriggerResponse {
  workflowId: string;
}
