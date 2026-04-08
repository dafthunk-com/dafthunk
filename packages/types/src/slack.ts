// Slack Runtime Types

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
