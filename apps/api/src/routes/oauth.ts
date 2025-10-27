import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, createIntegration, organizations } from "../db";
import {
  createOAuthState,
  validateOAuthState,
  getOAuthRedirectUri,
  handleOAuthError,
  type GoogleToken,
  type GoogleUser,
  type DiscordToken,
  type DiscordUser,
  type LinkedInToken,
  type LinkedInUser,
  type RedditToken,
  type RedditUser,
  type GitHubToken,
  type GitHubUser,
} from "../utils/oauth-helpers";

// Create a new Hono instance for OAuth endpoints
const oauthRoutes = new Hono<ApiContext>();

/**
 * GET /oauth/google-mail/connect
 *
 * Initiates Google Mail OAuth flow or handles callback
 */
oauthRoutes.get("/google-mail/connect", jwtMiddleware, async (c) => {
  const code = c.req.query("code");

  // If there's a code parameter, this is a callback from Google
  if (code) {
    try {
      const stateParam = c.req.query("state");
      const error = c.req.query("error");

      if (error) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
      }

      if (!code || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Validate OAuth state and get organization
      const { organizationId, orgHandle } = await validateOAuthState(c, stateParam);

      // Exchange code for token
      const clientId = c.env.INTEGRATION_GOOGLE_MAIL_CLIENT_ID;
      const clientSecret = c.env.INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=google_mail_not_configured`
        );
      }

      const redirectUri = getOAuthRedirectUri(c.env, "google-mail");

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Google Mail token exchange failed:", errorData);
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenResponse.json<GoogleToken>();

      // Get user info
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (!userResponse.ok) {
        console.error("Google user info fetch failed");
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=user_fetch_failed`
        );
      }

      const user = await userResponse.json<GoogleUser>();

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Google Mail - ${user.email || user.name}`;

      await createIntegration(
        db,
        organizationId,
        integrationName,
        "google-mail",
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000),
        JSON.stringify({
          email: user.email,
          name: user.name,
          picture: user.picture,
        }),
        c.env
      );

      return c.redirect(
        `${c.env.WEB_HOST}/org/${orgHandle}/integrations?success=google_mail_connected`
      );
    } catch (error) {
      return handleOAuthError(error, "Google Mail", c.env.WEB_HOST);
    }
  }

  // No code parameter - initiate OAuth flow
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=not_authenticated`);
  }
  const state = createOAuthState(organizationId, "google-mail");

  const clientId = c.env.INTEGRATION_GOOGLE_MAIL_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=google_mail_not_configured`
    );
  }

  const redirectUri = getOAuthRedirectUri(c.env, "google-mail");
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.modify",
  ];

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return c.redirect(authUrl.toString());
});

/**
 * GET /oauth/google-calendar/connect
 *
 * Initiates Google Calendar OAuth flow or handles callback
 */
oauthRoutes.get("/google-calendar/connect", jwtMiddleware, async (c) => {
  const code = c.req.query("code");

  // If there's a code parameter, this is a callback from Google
  if (code) {
    try {
      const stateParam = c.req.query("state");
      const error = c.req.query("error");

      if (error) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
      }

      if (!code || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Validate OAuth state and get organization
      const { organizationId, orgHandle } = await validateOAuthState(c, stateParam);

      // Exchange code for token
      const clientId = c.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID;
      const clientSecret = c.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=google_calendar_not_configured`
        );
      }

      const redirectUri = getOAuthRedirectUri(c.env, "google-calendar");

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Google Calendar token exchange failed:", errorData);
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenResponse.json<GoogleToken>();

      // Get user info
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (!userResponse.ok) {
        console.error("Google user info fetch failed");
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=user_fetch_failed`
        );
      }

      const user = await userResponse.json<GoogleUser>();

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Google Calendar - ${user.email || user.name}`;

      await createIntegration(
        db,
        organizationId,
        integrationName,
        "google-calendar",
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000),
        JSON.stringify({
          email: user.email,
          name: user.name,
          picture: user.picture,
        }),
        c.env
      );

      return c.redirect(
        `${c.env.WEB_HOST}/org/${orgHandle}/integrations?success=google_calendar_connected`
      );
    } catch (error) {
      return handleOAuthError(error, "Google Calendar", c.env.WEB_HOST);
    }
  }

  // No code parameter - initiate OAuth flow
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=not_authenticated`);
  }
  const state = createOAuthState(organizationId, "google-calendar");

  const clientId = c.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=google_calendar_not_configured`
    );
  }

  const redirectUri = getOAuthRedirectUri(c.env, "google-calendar");
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
  ];

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return c.redirect(authUrl.toString());
});

/**
 * GET /oauth/discord/connect
 *
 * Initiates Discord OAuth flow or handles callback
 */
oauthRoutes.get("/discord/connect", jwtMiddleware, async (c) => {
  const code = c.req.query("code");

  // If there's a code parameter, this is a callback from Discord
  if (code) {
    try {
      const stateParam = c.req.query("state");
      const error = c.req.query("error");

      if (error) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
      }

      if (!code || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Validate OAuth state and get organization
      const { organizationId, orgHandle } = await validateOAuthState(c, stateParam);

      // Exchange code for token
      const clientId = c.env.INTEGRATION_DISCORD_CLIENT_ID;
      const clientSecret = c.env.INTEGRATION_DISCORD_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=discord_not_configured`
        );
      }

      const redirectUri = getOAuthRedirectUri(c.env, "discord");

      const tokenResponse = await fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      if (!tokenResponse.ok) {
        console.error(
          "Discord token exchange failed:",
          await tokenResponse.text()
        );
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenResponse.json<DiscordToken>();

      // Fetch user information
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        console.error("Discord user fetch failed:", await userResponse.text());
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=user_fetch_failed`
        );
      }

      const user = await userResponse.json<DiscordUser>();

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Discord - ${user.username || user.global_name || "User"}`;

      await createIntegration(
        db,
        organizationId,
        integrationName,
        "discord",
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000),
        JSON.stringify({
          username: user.username,
          globalName: user.global_name,
          discriminator: user.discriminator,
          avatar: user.avatar,
          userId: user.id,
        }),
        c.env
      );

      return c.redirect(
        `${c.env.WEB_HOST}/org/${orgHandle}/integrations?success=discord_connected`
      );
    } catch (error) {
      return handleOAuthError(error, "Discord", c.env.WEB_HOST);
    }
  }

  // No code parameter - initiate OAuth flow
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=not_authenticated`);
  }
  const state = createOAuthState(organizationId, "discord");

  const clientId = c.env.INTEGRATION_DISCORD_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=discord_not_configured`
    );
  }

  const redirectUri = getOAuthRedirectUri(c.env, "discord");
  const scopes = ["identify", "email", "guilds"];

  const authUrl = new URL("https://discord.com/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes.join(" "));

  return c.redirect(authUrl.toString());
});

/**
 * GET /oauth/linkedin/connect
 *
 * Initiates LinkedIn OAuth flow or handles callback
 */
oauthRoutes.get("/linkedin/connect", jwtMiddleware, async (c) => {
  const code = c.req.query("code");

  // If there's a code parameter, this is a callback from LinkedIn
  if (code) {
    try {
      const stateParam = c.req.query("state");
      const error = c.req.query("error");

      if (error) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
      }

      if (!code || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Validate OAuth state and get organization
      const { organizationId, orgHandle } = await validateOAuthState(c, stateParam);

      // Exchange code for token
      const clientId = c.env.INTEGRATION_LINKEDIN_CLIENT_ID;
      const clientSecret = c.env.INTEGRATION_LINKEDIN_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=linkedin_not_configured`
        );
      }

      const redirectUri = getOAuthRedirectUri(c.env, "linkedin");

      const tokenResponse = await fetch(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("LinkedIn token exchange failed:", errorData);
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenResponse.json<LinkedInToken>();

      // Get user info using the new LinkedIn API v2
      const userResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        console.error("LinkedIn user info fetch failed");
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=user_fetch_failed`
        );
      }

      const user = await userResponse.json<LinkedInUser>();

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `LinkedIn - ${user.name || user.email || "User"}`;

      await createIntegration(
        db,
        organizationId,
        integrationName,
        "linkedin",
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000),
        JSON.stringify({
          userId: user.sub,
          name: user.name,
          givenName: user.given_name,
          familyName: user.family_name,
          email: user.email,
          picture: user.picture,
        }),
        c.env
      );

      return c.redirect(
        `${c.env.WEB_HOST}/org/${orgHandle}/integrations?success=linkedin_connected`
      );
    } catch (error) {
      return handleOAuthError(error, "LinkedIn", c.env.WEB_HOST);
    }
  }

  // No code parameter - initiate OAuth flow
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=not_authenticated`);
  }
  const state = createOAuthState(organizationId, "linkedin");

  const clientId = c.env.INTEGRATION_LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=linkedin_not_configured`
    );
  }

  const redirectUri = getOAuthRedirectUri(c.env, "linkedin");
  const scopes = ["openid", "profile", "email", "w_member_social"];

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes.join(" "));

  return c.redirect(authUrl.toString());
});

/**
 * GET /oauth/reddit/connect
 *
 * Initiates Reddit OAuth flow or handles callback
 */
oauthRoutes.get("/reddit/connect", jwtMiddleware, async (c) => {
  const code = c.req.query("code");

  // If there's a code parameter, this is a callback from Reddit
  if (code) {
    try {
      const stateParam = c.req.query("state");
      const error = c.req.query("error");

      if (error) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
      }

      if (!code || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Validate OAuth state and get organization
      const { organizationId, orgHandle } = await validateOAuthState(c, stateParam);

      // Exchange code for token
      const clientId = c.env.INTEGRATION_REDDIT_CLIENT_ID;
      const clientSecret = c.env.INTEGRATION_REDDIT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=reddit_not_configured`
        );
      }

      const redirectUri = getOAuthRedirectUri(c.env, "reddit");

      const tokenResponse = await fetch(
        "https://www.reddit.com/api/v1/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "web:dafthunk:v1.0.0 (by /u/dafthunk)",
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Reddit token exchange failed:", errorData);
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenResponse.json<RedditToken>();

      // Get user info
      const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "Dafthunk/1.0",
        },
      });

      if (!userResponse.ok) {
        console.error("Reddit user info fetch failed");
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=user_fetch_failed`
        );
      }

      const user = await userResponse.json<RedditUser>();

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Reddit - u/${user.name}`;

      await createIntegration(
        db,
        organizationId,
        integrationName,
        "reddit",
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000),
        JSON.stringify({
          username: user.name,
          userId: user.id,
          iconImg: user.icon_img,
        }),
        c.env
      );

      return c.redirect(
        `${c.env.WEB_HOST}/org/${orgHandle}/integrations?success=reddit_connected`
      );
    } catch (error) {
      return handleOAuthError(error, "Reddit", c.env.WEB_HOST);
    }
  }

  // No code parameter - initiate OAuth flow
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=not_authenticated`);
  }
  const state = createOAuthState(organizationId, "reddit");

  const clientId = c.env.INTEGRATION_REDDIT_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=reddit_not_configured`
    );
  }

  const redirectUri = getOAuthRedirectUri(c.env, "reddit");
  const scopes = ["identity", "submit", "read", "vote", "mysubreddits"];

  const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("duration", "permanent");
  authUrl.searchParams.set("scope", scopes.join(" "));

  return c.redirect(authUrl.toString());
});

/**
 * GET /oauth/github/connect
 *
 * Initiates GitHub OAuth flow or handles callback
 */
oauthRoutes.get("/github/connect", jwtMiddleware, async (c) => {
  const code = c.req.query("code");

  // If there's a code parameter, this is a callback from GitHub
  if (code) {
    try {
      const stateParam = c.req.query("state");
      const error = c.req.query("error");

      if (error) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
      }

      if (!code || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Validate OAuth state and get organization
      const { organizationId, orgHandle } = await validateOAuthState(c, stateParam);

      // Exchange code for token
      const clientId = c.env.INTEGRATION_GITHUB_CLIENT_ID;
      const clientSecret = c.env.INTEGRATION_GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=github_not_configured`
        );
      }

      const redirectUri = getOAuthRedirectUri(c.env, "github");

      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("GitHub token exchange failed:", errorData);
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=token_exchange_failed`
        );
      }

      const tokenData = await tokenResponse.json<GitHubToken>();

      if (!tokenData.access_token) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=no_access_token`
        );
      }

      // Get user info using GitHub API
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Dafthunk/1.0",
        },
      });

      if (!userResponse.ok) {
        console.error("GitHub user info fetch failed");
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=user_fetch_failed`
        );
      }

      const user = await userResponse.json<GitHubUser>();

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `GitHub - ${user.login || user.name}`;

      await createIntegration(
        db,
        organizationId,
        integrationName,
        "github",
        tokenData.access_token,
        undefined, // GitHub OAuth tokens don't have refresh tokens
        undefined, // GitHub OAuth tokens don't expire
        JSON.stringify({
          userId: user.id,
          login: user.login,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatar_url,
        }),
        c.env
      );

      return c.redirect(
        `${c.env.WEB_HOST}/org/${orgHandle}/integrations?success=github_connected`
      );
    } catch (error) {
      return handleOAuthError(error, "GitHub", c.env.WEB_HOST);
    }
  }

  // No code parameter - initiate OAuth flow
  const organizationId = c.get("organizationId");
  if (!organizationId) {
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=not_authenticated`);
  }
  const state = createOAuthState(organizationId, "github");

  const clientId = c.env.INTEGRATION_GITHUB_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=github_not_configured`
    );
  }

  const redirectUri = getOAuthRedirectUri(c.env, "github");
  const scopes = ["user", "repo", "read:org"];

  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scopes.join(" "));

  return c.redirect(authUrl.toString());
});

export default oauthRoutes;
