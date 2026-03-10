// Endpoint Types
export type EndpointMode = "webhook" | "request";

export interface CreateEndpointRequest {
  name: string;
  mode: EndpointMode;
}

export interface CreateEndpointResponse {
  id: string;
  name: string;
  handle: string;
  mode: EndpointMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetEndpointResponse {
  id: string;
  name: string;
  handle: string;
  mode: EndpointMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListEndpointsResponse {
  endpoints: {
    id: string;
    name: string;
    handle: string;
    mode: EndpointMode;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

export interface UpdateEndpointRequest {
  name: string;
  mode: EndpointMode;
}

export interface UpdateEndpointResponse {
  id: string;
  name: string;
  handle: string;
  mode: EndpointMode;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeleteEndpointResponse {
  id: string;
}

// Endpoint Trigger Types
export interface EndpointTrigger {
  workflowId: string;
  endpointId: string;
  active: boolean;
}

export interface GetEndpointTriggerResponse {
  workflowId: string;
  endpointId: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpsertEndpointTriggerRequest {
  endpointId: string;
  active?: boolean;
}

export type UpsertEndpointTriggerResponse = GetEndpointTriggerResponse;

export interface DeleteEndpointTriggerResponse {
  workflowId: string;
}
