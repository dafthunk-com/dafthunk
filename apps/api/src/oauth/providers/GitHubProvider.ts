import { OAuthProvider } from "../OAuthProvider";
import type { GitHubToken, GitHubUser } from "../types";

export class GitHubProvider extends OAuthProvider<GitHubToken, GitHubUser> {
  readonly name = "github";
  readonly displayName = "GitHub";
  readonly authorizationEndpoint = "https://github.com/login/oauth/authorize";
  readonly tokenEndpoint = "https://github.com/login/oauth/access_token";
  readonly userInfoEndpoint = "https://api.github.com/user";
  readonly scopes = ["user", "repo", "read:org"];

  // GitHub tokens don't expire, no refresh needed
  readonly refreshEnabled = false;

  // GitHub expects JSON response type header
  protected getTokenHeaders(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  // GitHub uses JSON body instead of URLSearchParams
  protected buildTokenRequestBody(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): any {
    return JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });
  }

  // GitHub user info needs special headers
  protected getUserInfoHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Dafthunk/1.0",
    };
  }

  // Required implementations
  protected formatIntegrationName(user: GitHubUser): string {
    return user.login || user.name;
  }

  protected formatUserMetadata(user: GitHubUser): Record<string, any> {
    return {
      userId: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
    };
  }

  protected extractAccessToken(token: GitHubToken): string {
    return token.access_token;
  }

  protected extractRefreshToken(_token: GitHubToken): undefined {
    return undefined; // GitHub tokens don't have refresh tokens
  }

  protected extractExpiresAt(_token: GitHubToken): undefined {
    return undefined; // GitHub tokens don't expire
  }
}
