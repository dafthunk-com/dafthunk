// Unified Bot Types

export type BotProvider = "discord" | "telegram" | "whatsapp" | "slack";

// Provider-specific metadata (plain data, not secrets)
export interface DiscordBotMetadata {
  applicationId: string;
  publicKey?: string;
}

export interface TelegramBotMetadata {
  botUsername?: string;
}

export interface WhatsAppBotMetadata {
  phoneNumberId: string;
  wabaId?: string;
}

export interface SlackBotMetadata {
  appId?: string;
  teamId?: string;
  teamName?: string;
}

export type BotMetadata =
  | DiscordBotMetadata
  | TelegramBotMetadata
  | WhatsAppBotMetadata
  | SlackBotMetadata;

// Provider-specific trigger metadata
export interface DiscordTriggerMetadata {
  commandName: string;
  commandDescription?: string;
  guildId?: string;
}

export interface TelegramTriggerMetadata {
  chatId?: string;
  secretToken?: string;
}

export interface WhatsAppTriggerMetadata {
  phoneNumberId?: string;
  verifyToken?: string;
}

export interface SlackTriggerMetadata {
  channelId?: string;
}

export type BotTriggerMetadata =
  | DiscordTriggerMetadata
  | TelegramTriggerMetadata
  | WhatsAppTriggerMetadata
  | SlackTriggerMetadata;

// Bot CRUD types
export interface CreateBotRequest {
  name: string;
  provider: BotProvider;
  token: string;
  // Provider-specific fields flattened for convenience
  applicationId?: string; // discord
  publicKey?: string; // discord
  phoneNumberId?: string; // whatsapp
  wabaId?: string; // whatsapp
  appSecret?: string; // whatsapp (encrypted)
  signingSecret?: string; // slack (encrypted)
}

export interface BotResponse {
  id: string;
  name: string;
  provider: BotProvider;
  tokenLastFour: string;
  metadata: Record<string, string | undefined> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type GetBotResponse = BotResponse;

export interface ListBotsResponse {
  bots: BotResponse[];
}

export interface UpdateBotRequest {
  name?: string;
  token?: string;
  // Provider-specific updatable fields
  publicKey?: string; // discord
  phoneNumberId?: string; // whatsapp
  wabaId?: string; // whatsapp
  appSecret?: string; // whatsapp (encrypted)
  signingSecret?: string; // slack (encrypted)
}

export type UpdateBotResponse = BotResponse;

export interface DeleteBotResponse {
  id: string;
}

// Bot Trigger types
export interface GetBotTriggerResponse {
  workflowId: string;
  botId: string | null;
  provider: BotProvider;
  metadata: Record<string, string | undefined> | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertBotTriggerRequest {
  botId: string;
  provider: BotProvider;
  active?: boolean;
  // Provider-specific trigger fields flattened
  commandName?: string; // discord
  commandDescription?: string; // discord
  guildId?: string; // discord
  chatId?: string; // telegram
  phoneNumberId?: string; // whatsapp
  channelId?: string; // slack
}

export type UpsertBotTriggerResponse = GetBotTriggerResponse;

export interface DeleteBotTriggerResponse {
  workflowId: string;
}

// Webhook info (used by WhatsApp)
export interface GetBotWebhookInfoResponse {
  webhookUrl: string | null;
  verifyToken: string | null;
}
