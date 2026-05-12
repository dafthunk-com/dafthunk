// Email Types
export interface CreateEmailRequest {
  name: string;
}

interface EmailResponseBase {
  id: string;
  name: string;
  handle: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateEmailResponse = EmailResponseBase;

export type GetEmailResponse = EmailResponseBase;

export interface ListEmailsResponse {
  emails: EmailResponseBase[];
}

export interface UpdateEmailRequest {
  name: string;
}

export type UpdateEmailResponse = EmailResponseBase;

export interface DeleteEmailResponse {
  id: string;
}

// Email Trigger Types
export interface EmailTrigger {
  workflowId: string;
  emailId: string;
  active: boolean;
}

export interface GetEmailTriggerResponse {
  workflowId: string;
  emailId: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertEmailTriggerRequest {
  emailId: string;
  active?: boolean;
}

export type UpsertEmailTriggerResponse = GetEmailTriggerResponse;

export interface DeleteEmailTriggerResponse {
  workflowId: string;
}
