import { OAuthProvider } from "../OAuthProvider";
import type { WordPressToken, WordPressUser } from "../types";

/**
 * WordPress.com OAuth 2.0 provider.
 *
 * Notes:
 * - Tokens do not expire and there is no refresh flow.
 * - Asking for `scope=global` lets the granted token act on any site the user owns;
 *   without it the user picks a single site and the token response carries `blog_id`.
 * - Token responses include extra fields beyond the OAuth spec (`blog_id`, `blog_url`)
 *   which we surface in integration metadata so nodes can default to the bound site.
 */
export class WordPressProvider extends OAuthProvider<
  WordPressToken,
  WordPressUser
> {
  readonly name = "wordpress";
  readonly displayName = "WordPress";
  readonly authorizationEndpoint =
    "https://public-api.wordpress.com/oauth2/authorize";
  readonly tokenEndpoint = "https://public-api.wordpress.com/oauth2/token";
  readonly userInfoEndpoint = "https://public-api.wordpress.com/rest/v1.1/me";
  readonly scopes = ["global"];

  // WordPress.com tokens don't expire and aren't refreshable
  readonly refreshEnabled = false;

  protected formatIntegrationName(user: WordPressUser): string {
    if (user.primary_blog_url) {
      try {
        return new URL(user.primary_blog_url).host;
      } catch {
        // fall through
      }
    }
    return user.display_name || user.username || `WordPress user ${user.ID}`;
  }

  protected formatUserMetadata(user: WordPressUser): Record<string, any> {
    return {
      userId: user.ID,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      primaryBlogId: user.primary_blog,
      primaryBlogUrl: user.primary_blog_url,
      avatarUrl: user.avatar_URL,
    };
  }

  extractAccessToken(token: WordPressToken): string {
    return token.access_token;
  }

  extractRefreshToken(_token: WordPressToken): undefined {
    return undefined;
  }

  extractExpiresAt(_token: WordPressToken): undefined {
    return undefined;
  }
}
