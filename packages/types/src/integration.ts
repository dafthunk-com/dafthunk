/**
 * Integration-related types for third-party service connections
 */

// Integration provider types
export type IntegrationProvider =
  | "google-mail"
  | "google-calendar"
  | "discord"
  | "openai";

// Base integration type (without sensitive token data)
export interface Integration {
  id: string;
  name: string;
  provider: IntegrationProvider;
  tokenExpiresAt?: Date;
  metadata?: string; // JSON string for provider-specific data
  createdAt: Date;
  updatedAt: Date;
}

// Integration with the actual token values (only returned when creating)
export interface IntegrationWithTokens {
  id: string;
  name: string;
  provider: IntegrationProvider;
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreateIntegrationRequest {
  name: string;
  provider: IntegrationProvider;
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: string;
}

export interface UpdateIntegrationRequest {
  name?: string;
  token?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: string;
}

// Response types
export interface ListIntegrationsResponse {
  integrations: Integration[];
}

export interface CreateIntegrationResponse {
  integration: Integration;
}

export interface GetIntegrationResponse {
  integration: Integration;
}

export interface UpdateIntegrationResponse {
  integration: Integration;
}

export interface DeleteIntegrationResponse {
  success: boolean;
}

// OAuth-specific types
export interface OAuthProvider {
  id: IntegrationProvider;
  name: string;
  description: string;
  supportsOAuth: boolean;
  oauthEndpoint?: string;
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "google-mail",
    name: "Google Mail",
    description: "Connect your Google Mail account to send and receive emails",
    supportsOAuth: true,
    oauthEndpoint: "/oauth/google-mail/connect",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync with Google Calendar to manage events",
    supportsOAuth: true,
    oauthEndpoint: "/oauth/google-calendar/connect",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Connect to Discord (coming soon)",
    supportsOAuth: false,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "Connect to OpenAI API (coming soon)",
    supportsOAuth: false,
  },
];
