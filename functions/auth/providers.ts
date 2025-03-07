import { Env } from "./jwt";

// Define the OAuth2 provider configuration interface
export interface OAuthProviderConfig {
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  userIdField: string;
  userNameField: string;
  userEmailField?: string;
  // Additional headers for API requests
  headers?: Record<string, string>;
}

// Get the OAuth2 provider configuration based on the provider name
export function getProviderConfig(
  provider: string,
  env: Env
): OAuthProviderConfig | null {
  switch (provider.toLowerCase()) {
    case "github":
      return {
        authorizationUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        userInfoUrl: "https://api.github.com/user",
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        scope: "read:user user:email",
        userIdField: "id",
        userNameField: "login",
        userEmailField: "email",
        // GitHub API requires a User-Agent header
        headers: {
          "User-Agent": "OAuth-Client",
          Accept: "application/json",
        },
      };
    default:
      return null;
  }
}

// Generate the authorization URL for the OAuth2 provider
export function generateAuthorizationUrl(
  provider: string,
  redirectUri: string,
  state: string,
  env: Env
): string | null {
  const config = getProviderConfig(provider, env);
  if (!config) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

// Generate a random state string for CSRF protection
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
