import { apiRequest } from "@/utils/api";
import { mutate } from "swr";

// Matches the ApiToken type in ApiKeysPage.tsx
// Consider moving to @dafthunk/types if used elsewhere
export interface ApiToken {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date; // Transformed from string
  readonly updatedAt: Date; // Transformed from string
  // lastUsedAt?: Date; // If API provides this
  // permissions?: string[]; // If API provides this
}

// Raw API response for a single token when listing
interface RawApiToken {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface FetchTokensResponse {
  tokens: RawApiToken[];
}

interface CreateTokenPayload {
  name: string;
}

// The API returns { token: "actual_key_string" }
interface CreateTokenResponse {
  token: string; // This is the actual secret key, not the ApiToken object
  // It might also return the created token object, adjust if needed
  // createdTokenObject?: RawApiToken;
}

const transformRawToken = (rawToken: RawApiToken): ApiToken => ({
  ...rawToken,
  createdAt: new Date(rawToken.createdAt),
  updatedAt: new Date(rawToken.updatedAt),
});

export const apiKeysService = {
  async getAll(): Promise<ApiToken[]> {
    const response = await apiRequest<FetchTokensResponse>("/tokens", {
      method: "GET",
      errorMessage: "Failed to fetch API keys",
    });
    return (response.tokens || []).map(transformRawToken);
  },

  async create(name: string): Promise<string> {
    const payload: CreateTokenPayload = { name };
    const response = await apiRequest<CreateTokenResponse>("/tokens", {
      method: "POST",
      body: payload,
      errorMessage: "Failed to create API key",
    });
    await mutate("/tokens");
    return response.token; // Returns the actual key string
  },

  async delete(tokenId: string): Promise<void> {
    await apiRequest<void>(`/tokens/${tokenId}`, {
      method: "DELETE",
      errorMessage: "Failed to delete API key",
    });
    await mutate("/tokens");
  },
};
