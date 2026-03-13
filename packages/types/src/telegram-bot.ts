// Telegram Bot Types

export interface CreateTelegramBotRequest {
  name: string;
  botToken: string;
}

export interface CreateTelegramBotResponse {
  id: string;
  name: string;

  botUsername: string | null;
  tokenLastFour: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type GetTelegramBotResponse = CreateTelegramBotResponse;

export interface ListTelegramBotsResponse {
  telegramBots: GetTelegramBotResponse[];
}

export interface UpdateTelegramBotRequest {
  name?: string;
  botToken?: string;
}

export type UpdateTelegramBotResponse = GetTelegramBotResponse;

export interface DeleteTelegramBotResponse {
  id: string;
}
