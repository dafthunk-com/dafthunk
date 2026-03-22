import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import { memberships } from "../db/schema";
import { getProvider, OAuthError } from "../oauth";

// Create a new Hono instance for OAuth endpoints
const oauthRoutes = new Hono<ApiContext>();

/**
 * Middleware to override organization context from query parameter.
 * Used during OAuth initiation when the frontend passes the current org.
 * Validates membership before accepting the override.
 */
const resolveOrgFromQuery = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const orgIdFromQuery = c.req.query("organizationId");
  if (orgIdFromQuery) {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    const db = createDatabase(c.env.DB);

    const [membership] = await db
      .select({ organizationId: memberships.organizationId })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, payload.sub),
          eq(memberships.organizationId, orgIdFromQuery)
        )
      );

    if (!membership) {
      return c.json({ error: "Organization not found or access denied" }, 403);
    }

    c.set("organizationId", membership.organizationId);
  }
  await next();
};

/**
 * GET /oauth/:provider/connect
 *
 * Universal OAuth handler that works for all providers
 * - Initiates OAuth flow when no code parameter is present
 * - Handles OAuth callback when code parameter is present
 *
 * Supported providers: google-mail, google-calendar, discord, linkedin, reddit, github
 */
oauthRoutes.get(
  "/:provider/connect",
  jwtMiddleware,
  resolveOrgFromQuery,
  async (c) => {
    const providerName = c.req.param("provider");

    try {
      const provider = getProvider(providerName);
      const code = c.req.query("code");

      // Callback flow - provider redirected back with authorization code
      if (code) {
        const stateParam = c.req.query("state");
        const error = c.req.query("error");

        // Check for authorization errors from provider
        if (error) {
          return c.redirect(`${c.env.WEB_HOST}/integrations?error=${error}`);
        }

        // State parameter is required for CSRF protection
        if (!stateParam) {
          return c.redirect(
            `${c.env.WEB_HOST}/integrations?error=oauth_failed`
          );
        }

        // Let the provider handle the complete callback flow:
        // 1. Validate state (CSRF + organization membership)
        // 2. Exchange code for access token
        // 3. Fetch user information
        // 4. Create integration in database
        const { orgId } = await provider.handleCallback(c, code, stateParam);

        return c.redirect(
          `${c.env.WEB_HOST}/org/${orgId}/integrations?success=${providerName}_connected`
        );
      }

      // Initiation flow - no code parameter, start OAuth flow
      // Provider will:
      // 1. Validate organization context
      // 2. Create secure state with nonce
      // 3. Build authorization URL with correct parameters
      const authUrl = await provider.initiateAuth(c);
      return c.redirect(authUrl);
    } catch (error) {
      // Handle OAuth-specific errors with user-friendly redirects
      if (error instanceof OAuthError) {
        return c.redirect(
          `${c.env.WEB_HOST}/integrations?error=${error.redirectError}`
        );
      }

      // Log unexpected errors and show generic error
      console.error(`OAuth error for ${providerName}:`, error);
      return c.redirect(`${c.env.WEB_HOST}/integrations?error=oauth_failed`);
    }
  }
);

export default oauthRoutes;
