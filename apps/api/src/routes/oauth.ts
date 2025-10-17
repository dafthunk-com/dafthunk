import { JWTTokenPayload } from "@dafthunk/types";
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
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
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
        token.access_token,
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
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
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
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=oauth_failed`
        );
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
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=invalid_state`
        );
      }

      // Validate state is recent (within 10 minutes)
      if (Date.now() - state.timestamp > 10 * 60 * 1000) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=expired_state`
        );
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
        token.access_token,
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

export default oauthRoutes;
