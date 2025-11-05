// Queue Types
export interface CreateQueueRequest {
  name: string;
}

export interface CreateQueueResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetQueueResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListQueuesResponse {
  queues: {
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export interface UpdateQueueRequest {
  name: string;
}

export interface UpdateQueueResponse {
  id: string;
  name: string;
  handle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteQueueResponse {
  id: string;
}

// Queue Trigger Types
export interface QueueTrigger {
  workflowId: string;
  queueId: string;
  active: boolean;
}

export interface GetQueueTriggerResponse {
  workflowId: string;
  queueId: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertQueueTriggerRequest {
  queueId: string;
  active?: boolean;
}

export type UpsertQueueTriggerResponse = GetQueueTriggerResponse;

export interface DeleteQueueTriggerResponse {
  workflowId: string;
}

// Queue Message Type
export interface QueueMessage {
  queueId: string;
  organizationId: string;
  payload: unknown;
  timestamp: number;
}
