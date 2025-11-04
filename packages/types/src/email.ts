// Email Types
export interface CreateEmailRequest {
  name: string;
}

export interface CreateEmailResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetEmailResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListEmailsResponse {
  emails: {
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export interface UpdateEmailRequest {
  name: string;
}

export interface UpdateEmailResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

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
