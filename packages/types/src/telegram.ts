// Telegram Trigger Types

export interface TelegramMessage {
  chatId: number;
  messageId: number;
  content: string;
  author: { id: number; username: string; firstName: string; isBot: boolean };
  timestamp: number;
}

export interface GetTelegramTriggerResponse {
  workflowId: string;
  chatId: string | null;
  telegramBotId: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertTelegramTriggerRequest {
  chatId?: string;
  telegramBotId: string;
  active?: boolean;
}

export type UpsertTelegramTriggerResponse = GetTelegramTriggerResponse;

export interface DeleteTelegramTriggerResponse {
  workflowId: string;
}
