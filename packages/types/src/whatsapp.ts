// WhatsApp Trigger Types

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

export interface GetWhatsAppTriggerResponse {
  workflowId: string;
  phoneNumberId: string | null;
  whatsappAccountId: string | null;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertWhatsAppTriggerRequest {
  phoneNumberId?: string;
  whatsappAccountId: string;
  active?: boolean;
}

export type UpsertWhatsAppTriggerResponse = GetWhatsAppTriggerResponse;

export interface DeleteWhatsAppTriggerResponse {
  workflowId: string;
}
