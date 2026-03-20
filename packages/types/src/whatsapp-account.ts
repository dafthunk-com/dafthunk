// WhatsApp Account Types

export interface CreateWhatsAppAccountRequest {
  name: string;
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  appSecret?: string;
}

export interface CreateWhatsAppAccountResponse {
  id: string;
  name: string;
  phoneNumberId: string;
  wabaId: string | null;
  tokenLastFour: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type GetWhatsAppAccountResponse = CreateWhatsAppAccountResponse;

export interface ListWhatsAppAccountsResponse {
  whatsappAccounts: GetWhatsAppAccountResponse[];
}

export interface UpdateWhatsAppAccountRequest {
  name?: string;
  accessToken?: string;
  phoneNumberId?: string;
  wabaId?: string;
  appSecret?: string;
}

export type UpdateWhatsAppAccountResponse = GetWhatsAppAccountResponse;

export interface DeleteWhatsAppAccountResponse {
  id: string;
}
