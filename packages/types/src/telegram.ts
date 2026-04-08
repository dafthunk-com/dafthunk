// Telegram Runtime Types

export interface TelegramMessage {
  telegramBotId?: string;
  chatId: number;
  messageId: number;
  content: string;
  author: { id: number; username: string; firstName: string; isBot: boolean };
  timestamp: number;
}
