import { JWTTokenPayload } from "@dafthunk/types";
import { discordAuth } from "@hono/oauth-providers/discord";
import { googleAuth } from "@hono/oauth-providers/google";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { jwtVerify } from "jose";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, createIntegration } from "../db";

// Create a new Hono instance for OAuth endpoints
const oauthRoutes = new Hono<ApiContext>();

/**
 * GET /oauth/google-mail/connect
 *
 * Initiates Google Mail OAuth flow
 */
oauthRoutes.get(
  "/google-mail/connect",
  jwtMiddleware,
  (c, next) => {
    // Store organization ID in state for callback
    const organizationId = c.get("organizationId");
    const state = btoa(
      JSON.stringify({
        organizationId,
        provider: "google-mail",
        timestamp: Date.now(),
      })
    );

    const googleAuthHandler = googleAuth({
      client_id: c.env.INTEGRATION_GOOGLE_MAIL_CLIENT_ID,
      client_secret: c.env.INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
      state,
    });
    return googleAuthHandler(c, next);
  },
  async (c) => {
    try {
      const token = c.get("token") as any; // OAuth token from provider
      const user = c.get("user-google");
      const stateParam = c.req.query("state");

      if (!token || !user || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Decode and validate state
      let state: {
        organizationId: string;
        provider: string;
        timestamp: number;
      };
      try {
        state = JSON.parse(atob(stateParam));
      } catch {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=invalid_state`);
      }

      // Validate state is recent (within 10 minutes)
      if (Date.now() - state.timestamp > 10 * 60 * 1000) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=expired_state`);
      }

      // Verify user is authenticated and matches organization
      const accessToken = getCookie(c, "access_token");
      if (!accessToken) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=not_authenticated`
        );
      }

      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      let payload: JWTTokenPayload | null = null;
      try {
        const verified = await jwtVerify(accessToken, secret);
        payload = verified.payload as JWTTokenPayload;
      } catch {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=not_authenticated`
        );
      }

      if (!payload || payload.organization.id !== state.organizationId) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=organization_mismatch`
        );
      }

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Google Mail - ${user.email || user.name}`;

      await createIntegration(
        db,
        state.organizationId,
        integrationName,
        "google-mail",
        token.token, // The actual access token is in token.token, not token.access_token
        token.refresh_token,
        token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : undefined,
        JSON.stringify({
          email: user.email,
          name: user.name,
          picture: user.picture,
        }),
        c.env
      );

      // Redirect back to integrations page with success
      return c.redirect(
        `${c.env.WEB_HOST}/integrations?success=google_mail_connected`
      );
    } catch (error) {
      console.error("Google Mail OAuth error:", error);
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
    }
  }
);

/**
 * GET /oauth/google-calendar/connect
 *
 * Initiates Google Calendar OAuth flow
 */
oauthRoutes.get(
  "/google-calendar/connect",
  jwtMiddleware,
  (c, next) => {
    // Store organization ID in state for callback
    const organizationId = c.get("organizationId");
    const state = btoa(
      JSON.stringify({
        organizationId,
        provider: "google-calendar",
        timestamp: Date.now(),
      })
    );

    const googleAuthHandler = googleAuth({
      client_id: c.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: c.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
      ],
      state,
    });
    return googleAuthHandler(c, next);
  },
  async (c) => {
    try {
      const token = c.get("token") as any; // OAuth token from provider
      const user = c.get("user-google");
      const stateParam = c.req.query("state");

      if (!token || !user || !stateParam) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Decode and validate state
      let state: {
        organizationId: string;
        provider: string;
        timestamp: number;
      };
      try {
        state = JSON.parse(atob(stateParam));
      } catch {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=invalid_state`);
      }

      // Validate state is recent (within 10 minutes)
      if (Date.now() - state.timestamp > 10 * 60 * 1000) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=expired_state`);
      }

      // Verify user is authenticated and matches organization
      const accessToken = getCookie(c, "access_token");
      if (!accessToken) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=not_authenticated`
        );
      }

      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      let payload: JWTTokenPayload | null = null;
      try {
        const verified = await jwtVerify(accessToken, secret);
        payload = verified.payload as JWTTokenPayload;
      } catch {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=not_authenticated`
        );
      }

      if (!payload || payload.organization.id !== state.organizationId) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=organization_mismatch`
        );
      }

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Google Calendar - ${user.email || user.name}`;

      await createIntegration(
        db,
        state.organizationId,
        integrationName,
        "google-calendar",
        token.token, // The actual access token is in token.token, not token.access_token
        token.refresh_token,
        token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : undefined,
        JSON.stringify({
          email: user.email,
          name: user.name,
          picture: user.picture,
        }),
        c.env
      );

      // Redirect back to integrations page with success
      return c.redirect(
        `${c.env.WEB_HOST}/integrations?success=google_calendar_connected`
      );
    } catch (error) {
      console.error("Google Calendar OAuth error:", error);
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
    }
  }
);

/**
 * GET /oauth/discord/connect
 *
 * Initiates Discord OAuth flow
 */
oauthRoutes.get(
  "/discord/connect",
  jwtMiddleware,
  (c, next) => {
    const discordAuthHandler = discordAuth({
      client_id: c.env.INTEGRATION_DISCORD_CLIENT_ID,
      client_secret: c.env.INTEGRATION_DISCORD_CLIENT_SECRET,
      scope: ["identify", "email", "guilds"],
    });
    return discordAuthHandler(c, next);
  },
  async (c) => {
    try {
      const token = c.get("token") as any; // OAuth token from provider
      const user = c.get("user-discord");

      if (!token || !user) {
        return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
      }

      // Verify user is still authenticated and get organization from JWT
      const accessToken = getCookie(c, "access_token");
      if (!accessToken) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=not_authenticated`
        );
      }

      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      let payload: JWTTokenPayload | null = null;
      try {
        const verified = await jwtVerify(accessToken, secret);
        payload = verified.payload as JWTTokenPayload;
      } catch {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=not_authenticated`
        );
      }

      if (!payload || !payload.organization?.id) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=organization_mismatch`
        );
      }

      // Create integration with OAuth tokens
      const db = createDatabase(c.env.DB);
      const integrationName = `Discord - ${user.username || user.global_name || "User"}`;

      await createIntegration(
        db,
        payload.organization.id,
        integrationName,
        "discord",
        token.token, // The actual access token is in token.token, not token.access_token
        token.refresh_token,
        token.expires_in
          ? new Date(Date.now() + token.expires_in * 1000)
          : undefined,
        JSON.stringify({
          username: user.username,
          globalName: user.global_name,
          discriminator: user.discriminator,
          avatar: user.avatar,
          userId: user.id,
        }),
        c.env
      );

      // Redirect back to integrations page with success
      return c.redirect(
        `${c.env.WEB_HOST}/integrations?success=discord_connected`
      );
    } catch (error) {
      console.error("Discord OAuth error:", error);
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
    }
  }
);

/**
 * GET /oauth/linkedin/connect
 *
 * Initiates LinkedIn OAuth flow
 */
oauthRoutes.get("/linkedin/connect", jwtMiddleware, (c) => {
  const organizationId = c.get("organizationId");
  const state = btoa(
    JSON.stringify({
      organizationId,
      provider: "linkedin",
      timestamp: Date.now(),
    })
  );

  const clientId = c.env.INTEGRATION_LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=linkedin_not_configured`
    );
  }

  // Determine redirect URI based on environment
  const redirectUri =
    c.env.CLOUDFLARE_ENV === "production"
      ? `https://api.dafthunk.com/oauth/linkedin/callback`
      : `http://localhost:3001/oauth/linkedin/callback`;

  // LinkedIn OAuth scopes for posting and profile access
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
 * GET /oauth/linkedin/callback
 *
 * Handles LinkedIn OAuth callback
 */
oauthRoutes.get("/linkedin/callback", async (c) => {
  try {
    const code = c.req.query("code");
    const stateParam = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
    }

    if (!code || !stateParam) {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
    }

    // Decode and validate state
    let state: {
      organizationId: string;
      provider: string;
      timestamp: number;
    };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=invalid_state`);
    }

    // Validate state is recent (within 10 minutes)
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=expired_state`);
    }

    // Exchange code for token
    const clientId = c.env.INTEGRATION_LINKEDIN_CLIENT_ID;
    const clientSecret = c.env.INTEGRATION_LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return c.redirect(
        `${c.env.WEB_HOST}/integrations?error=linkedin_not_configured`
      );
    }

    // Determine redirect URI based on environment (must match the one used in /connect)
    const redirectUri =
      c.env.CLOUDFLARE_ENV === "production"
        ? `https://api.dafthunk.com/oauth/linkedin/callback`
        : `http://localhost:3001/oauth/linkedin/callback`;

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

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
    };

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

    const user = (await userResponse.json()) as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
      picture?: string;
    };

    // Create integration with OAuth tokens
    const db = createDatabase(c.env.DB);
    const integrationName = `LinkedIn - ${user.name || user.email || "User"}`;

    await createIntegration(
      db,
      state.organizationId,
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

    // Redirect back to integrations page with success
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?success=linkedin_connected`
    );
  } catch (error) {
    console.error("LinkedIn OAuth error:", error);
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
  }
});

/**
 * GET /oauth/reddit/connect
 *
 * Initiates Reddit OAuth flow
 */
oauthRoutes.get("/reddit/connect", jwtMiddleware, (c) => {
  const organizationId = c.get("organizationId");
  const state = btoa(
    JSON.stringify({
      organizationId,
      provider: "reddit",
      timestamp: Date.now(),
    })
  );

  const clientId = c.env.INTEGRATION_REDDIT_CLIENT_ID;
  if (!clientId) {
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?error=reddit_not_configured`
    );
  }

  // Determine redirect URI based on environment
  // In production, this should match your deployed API URL
  const redirectUri =
    c.env.CLOUDFLARE_ENV === "production"
      ? `https://api.dafthunk.com/oauth/reddit/callback`
      : `http://localhost:3001/oauth/reddit/callback`;

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
 * GET /oauth/reddit/callback
 *
 * Handles Reddit OAuth callback
 */
oauthRoutes.get("/reddit/callback", async (c) => {
  try {
    const code = c.req.query("code");
    const stateParam = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
    }

    if (!code || !stateParam) {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
    }

    // Decode and validate state
    let state: {
      organizationId: string;
      provider: string;
      timestamp: number;
    };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=invalid_state`);
    }

    // Validate state is recent (within 10 minutes)
    if (Date.now() - state.timestamp > 10 * 60 * 1000) {
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=expired_state`);
    }

    // Exchange code for token
    const clientId = c.env.INTEGRATION_REDDIT_CLIENT_ID;
    const clientSecret = c.env.INTEGRATION_REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return c.redirect(
        `${c.env.WEB_HOST}/integrations?error=reddit_not_configured`
      );
    }

    // Determine redirect URI based on environment (must match the one used in /connect)
    const redirectUri =
      c.env.CLOUDFLARE_ENV === "production"
        ? `https://api.dafthunk.com/oauth/reddit/callback`
        : `http://localhost:3001/oauth/reddit/callback`;

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

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

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

    const user = (await userResponse.json()) as {
      name: string;
      id: string;
      icon_img?: string;
    };

    // Create integration with OAuth tokens
    const db = createDatabase(c.env.DB);
    const integrationName = `Reddit - u/${user.name}`;

    await createIntegration(
      db,
      state.organizationId,
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

    // Redirect back to integrations page with success
    return c.redirect(
      `${c.env.WEB_HOST}/integrations?success=reddit_connected`
    );
  } catch (error) {
    console.error("Reddit OAuth error:", error);
    return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
  }
});

export default oauthRoutes;
