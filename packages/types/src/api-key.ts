/**
 * Represents an API key record as stored in the database
 * Mirrors the ApiKey type from the database schema
 */
export interface ApiKey {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a newly created API key with its secret
 * The secret is only returned once when the key is created
 */
export interface ApiKeyWithSecret {
  apiKey: string;
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * Request to create a new API key
 */
export interface CreateApiKeyRequest {
  name: string;
}

/**
 * Response for listing API keys
 */
export interface ListApiKeysResponse {
  apiKeys: ApiKey[];
}

/**
 * Response when creating a new API key
 */
export interface CreateApiKeyResponse {
  apiKey: ApiKeyWithSecret;
}

/**
 * Response when deleting an API key
 */
export interface DeleteApiKeyResponse {
  success: boolean;
}
