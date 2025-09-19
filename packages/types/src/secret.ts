/**
 * Secret-related types for the API
 */

// Base secret type (without the encrypted value)
export interface Secret {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Secret with the actual secret value (only returned when creating)
export interface SecretWithValue {
  id: string;
  name: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface CreateSecretRequest {
  name: string;
  value: string;
}

export interface UpdateSecretRequest {
  name?: string;
  value?: string;
}

// Response types
export interface ListSecretsResponse {
  secrets: Secret[];
}

export interface CreateSecretResponse {
  secret: SecretWithValue;
}

export interface GetSecretResponse {
  secret: Secret;
}

export interface UpdateSecretResponse {
  secret: Secret;
}

export interface DeleteSecretResponse {
  success: boolean;
}

export interface GetSecretValueResponse {
  value: string;
}
