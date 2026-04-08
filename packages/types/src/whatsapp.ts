// WhatsApp Runtime Types

export interface WhatsAppMessage {
  whatsappAccountId?: string;
  phoneNumberId: string;
  from: string;
  messageId: string;
  content: string;
  timestamp: number;
  author: { phoneNumber: string; name: string };
  messageType: string;
}
