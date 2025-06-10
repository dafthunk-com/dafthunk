import { JWTTokenPayload, OrganizationInfo } from "@dafthunk/types";
import { githubAuth } from "@hono/oauth-providers/github";
import { googleAuth } from "@hono/oauth-providers/google";
import { eq } from "drizzle-orm";
import { Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { jwtVerify, SignJWT } from "jose";

import { ApiContext } from "./context";
import {
  createDatabase,
  OrganizationRole,
  organizations,
  saveUser,
  users,
  verifyApiKey,
} from "./db";

// Constants
const JWT_ACCESS_TOKEN_NAME = "access_token";
const JWT_REFRESH_TOKEN_NAME = "refresh_token";
const JWT_ACCESS_TOKEN_DURATION = 300; // 5 minutes
const JWT_REFRESH_TOKEN_DURATION = 86400; // 1 days

// Security validation
const validateJWTSecret = (secret: string): void => {
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
  if (secret === "your-secret-key" || secret === "development") {
    throw new Error("JWT_SECRET must not use default/weak values");
  }
};

// Utility functions
const createAccessToken = async (
  payload: JWTTokenPayload,
  jwtSecret: string
): Promise<string> => {
  validateJWTSecret(jwtSecret);
  const secret = new TextEncoder().encode(jwtSecret);
  const expirationTime =
    Math.floor(Date.now() / 1000) + JWT_ACCESS_TOKEN_DURATION;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
};

const createRefreshToken = async (
  payload: { sub: string; organization: { id: string } },
  jwtSecret: string
): Promise<string> => {
  validateJWTSecret(jwtSecret);
  const secret = new TextEncoder().encode(jwtSecret);
  const expirationTime =
    Math.floor(Date.now() / 1000) + JWT_REFRESH_TOKEN_DURATION;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
};

const verifyToken = async (token: string, jwtSecret: string) => {
  validateJWTSecret(jwtSecret);
  const secret = new TextEncoder().encode(jwtSecret);
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    // Log security event without exposing details
    console.warn(
      "Token verification failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
};

const urlToTopLevelDomain = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.hostname.split(".");

    // For localhost development
    if (
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1"
    ) {
      return parsedUrl.hostname;
    }

    // Validate hostname format
    if (parts.length < 2) {
      throw new Error("Invalid hostname format");
    }

    // Extract top-level domain (last two parts)
    return parts.slice(-2).join(".");
  } catch (error) {
    console.error("Invalid URL for domain extraction:", url, error);
    throw new Error("Invalid web host URL");
  }
};

// Input validation helpers
const validateUserData = (user: any, provider: string) => {
  const requiredFields = ["id", "name"];
  const missing = requiredFields.filter((field) => !user[field]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required fields from ${provider}: ${missing.join(", ")}`
    );
  }

  // Sanitize name to prevent potential injection
  if (typeof user.name !== "string" || user.name.length > 255) {
    throw new Error(`Invalid name format from ${provider}`);
  }

  // Validate email format if provided
  if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    console.warn(`Invalid email format from ${provider}:`, user.email);
    user.email = undefined; // Clear invalid email
  }

  return user;
};

const setCookieOptions = (c: Context<ApiContext>, maxAge: number) => ({
  httpOnly: true,
  secure: c.env.CLOUDFLARE_ENV !== "development",
  sameSite: "Lax" as const,
  domain: urlToTopLevelDomain(c.env.WEB_HOST),
  maxAge,
  path: "/",
});

// Auth middleware
export const jwtMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const accessToken = getCookie(c, JWT_ACCESS_TOKEN_NAME);

  if (!accessToken) {
    return c.json({ error: "No access token" }, 401);
  }

  const payload = (await verifyToken(
    accessToken,
    c.env.JWT_SECRET
  )) as JWTTokenPayload | null;

  if (!payload || !payload.organization?.id) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  // Check if token is about to expire (less than 5 minutes left)
  const now = Math.floor(Date.now() / 1000);
  const exp = payload.exp as number;

  if (exp - now < 300) {
    // 5 minutes
    c.header("X-Token-Refresh-Needed", "true");
  }

  const allowedPaths = [
    "/auth/login/github",
    "/auth/login/google",
    "/auth/user",
    "/auth/logout",
    "/auth/refresh",
  ];

  if (payload.inWaitlist && !allowedPaths.includes(c.req.path)) {
    return c.json(
      { error: "Access denied. You are currently on our waitlist." },
      403
    );
  }

  c.set("jwtPayload", payload);
  c.set("organizationId", payload.organization.id);
  await next();
};

// API key authentication middleware
export const apiKeyMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const authHeader = c.req.header("Authorization");
  const organizationIdOrHandleFromUrl = c.req.param("organizationIdOrHandle");

  if (!organizationIdOrHandleFromUrl) {
    // This should ideally not happen if routes are configured correctly
    return c.json({ error: "Organization ID or handle missing from URL" }, 400);
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "API key is required" }, 401);
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  const db = createDatabase(c.env.DB);

  const validatedOrganizationId = await verifyApiKey(
    db,
    apiKey,
    organizationIdOrHandleFromUrl
  );

  if (!validatedOrganizationId) {
    return c.json(
      { error: "Invalid API key for the specified organization" },
      401
    );
  }

  // Store the validated organization ID in the context for later use
  c.set("organizationId", validatedOrganizationId);

  await next();
};

// Middleware that allows either JWT or API key authentication
export const apiKeyOrJwtMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const authHeader = c.req.header("Authorization");
  const organizationIdOrHandleFromUrl = c.req.param("organizationIdOrHandle");

  // If Authorization header is present, try API key auth
  if (authHeader && authHeader.startsWith("Bearer ")) {
    if (!organizationIdOrHandleFromUrl) {
      return c.json(
        {
          error: "Organization ID or handle missing from URL for API key auth",
        },
        400
      );
    }
    return apiKeyMiddleware(c, next); // apiKeyMiddleware will handle org verification
  }

  // Otherwise, try JWT auth (which might not need organizationIdOrHandleFromUrl explicitly here,
  // as JWT payload should contain organization info if needed by downstream handlers)
  return jwtMiddleware(c, next);
};

// Helper function to set both tokens
const setAuthTokens = async (
  c: Context<ApiContext>,
  accessPayload: JWTTokenPayload,
  refreshPayload: { sub: string; organization: { id: string } }
) => {
  const accessToken = await createAccessToken(accessPayload, c.env.JWT_SECRET);
  const refreshToken = await createRefreshToken(
    refreshPayload,
    c.env.JWT_SECRET
  );

  setCookie(
    c,
    JWT_ACCESS_TOKEN_NAME,
    accessToken,
    setCookieOptions(c, JWT_ACCESS_TOKEN_DURATION)
  );

  setCookie(
    c,
    JWT_REFRESH_TOKEN_NAME,
    refreshToken,
    setCookieOptions(c, JWT_REFRESH_TOKEN_DURATION)
  );
};

// Create auth router
const auth = new Hono<ApiContext>();

auth.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, JWT_REFRESH_TOKEN_NAME);

  if (!refreshToken) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const payload = await verifyToken(refreshToken, c.env.JWT_SECRET);

  if (!payload || !payload.sub || !(payload.organization as any)?.id) {
    console.warn("Invalid refresh token attempt", {
      hasPayload: !!payload,
      hasSub: !!payload?.sub,
      hasOrg: !!(payload?.organization as any)?.id,
    });
    return c.json({ error: "Authentication required" }, 401);
  }

  const db = createDatabase(c.env.DB);

  try {
    // Get fresh user data
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub as string));

    if (userResults.length === 0) {
      console.warn("User not found during refresh", { userId: payload.sub });
      return c.json({ error: "Authentication required" }, 401);
    }
    const result = userResults[0];

    // Get organization data
    const orgResults = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, (payload.organization as any).id));

    if (orgResults.length === 0) {
      console.warn("Organization not found during refresh", {
        orgId: (payload.organization as any).id,
      });
      return c.json({ error: "Authentication required" }, 401);
    }
    const orgResult = orgResults[0];

    // Determine provider from githubId/googleId fields
    const provider: "github" | "google" = result.githubId ? "github" : "google";

    const accessPayload: JWTTokenPayload = {
      sub: result.id,
      name: result.name,
      email: result.email ?? undefined,
      avatarUrl: result.avatarUrl ?? undefined,
      plan: result.plan,
      role: result.role,
      inWaitlist: result.inWaitlist,
      provider,
      organization: {
        id: orgResult.id,
        name: orgResult.name,
        handle: orgResult.handle,
        role: "member", // TODO: get actual role
      },
    };

    await setAuthTokens(c, accessPayload, {
      sub: result.id,
      organization: { id: (payload.organization as any).id },
    });

    return c.json({ success: true, user: accessPayload });
  } catch (error) {
    console.error("Error during token refresh:", error);
    return c.json({ error: "Authentication required" }, 401);
  }
});

auth.post("/logout", (c) => {
  deleteCookie(c, JWT_ACCESS_TOKEN_NAME, {
    domain: urlToTopLevelDomain(c.env.WEB_HOST),
    path: "/",
  });
  deleteCookie(c, JWT_REFRESH_TOKEN_NAME, {
    domain: urlToTopLevelDomain(c.env.WEB_HOST),
    path: "/",
  });
  return c.redirect(c.env.WEB_HOST);
});

auth.get(
  "/login/github",
  (c, next) => {
    const githubAuthHandler = githubAuth({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      scope: ["read:user", "user:email"],
      oauthApp: true,
    });
    return githubAuthHandler(c, next);
  },
  async (c) => {
    const user = c.get("user-github");
    if (!user) {
      return c.json({ error: "Authentication failed" }, 400);
    }

    try {
      const validatedUser = validateUserData(
        {
          id: user.id,
          name: user.name || user.login,
          email: user.email,
          avatar_url: user.avatar_url,
        },
        "GitHub"
      );

      const userId = validatedUser.id.toString();
      const userName = validatedUser.name;
      const userEmail = validatedUser.email || undefined;
      const avatarUrl = validatedUser.avatar_url;

      const db = createDatabase(c.env.DB);

      // Save user and create organization if needed
      const userData = {
        provider: "github" as const,
        providerId: userId,
        name: userName,
        email: userEmail,
        avatarUrl,
      };
      const { user: savedUser, organization: savedOrganization } =
        await saveUser(db, userData);

      const organizationInfo: OrganizationInfo = {
        id: savedOrganization.id,
        name: savedOrganization.name,
        handle: savedOrganization.handle,
        role: OrganizationRole.OWNER,
      };

      const accessPayload: JWTTokenPayload = {
        sub: savedUser.id,
        name: userName,
        email: userEmail ?? undefined,
        avatarUrl,
        plan: savedUser.plan,
        role: savedUser.role,
        inWaitlist: savedUser.inWaitlist,
        provider: "github",
        organization: organizationInfo,
      };

      const refreshPayload = {
        sub: savedUser.id,
        organization: { id: savedOrganization.id },
      };

      await setAuthTokens(c, accessPayload, refreshPayload);

      return c.redirect(c.env.WEB_HOST);
    } catch (error) {
      console.error("GitHub authentication error:", error);
      return c.json({ error: "Authentication failed" }, 400);
    }
  }
);

auth.get(
  "/login/google",
  (c, next) => {
    const googleAuthHandler = googleAuth({
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      scope: ["openid", "email", "profile"],
    });
    return googleAuthHandler(c, next);
  },
  async (c) => {
    const user = c.get("user-google");
    if (!user) {
      return c.json({ error: "Authentication failed" }, 400);
    }

    try {
      const validatedUser = validateUserData(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.picture,
        },
        "Google"
      );

      const userId = validatedUser.id.toString();
      const userName = validatedUser.name;
      const userEmail = validatedUser.email as string | undefined;
      const avatarUrl = validatedUser.avatar_url;

      const db = createDatabase(c.env.DB);

      // Save user and create organization if needed
      const userData = {
        provider: "google" as const,
        providerId: userId,
        name: userName,
        email: userEmail,
        avatarUrl,
      };
      const { user: savedUser, organization: savedOrganization } =
        await saveUser(db, userData);

      const organizationInfo: OrganizationInfo = {
        id: savedOrganization.id,
        name: savedOrganization.name,
        handle: savedOrganization.handle,
        role: OrganizationRole.OWNER,
      };

      const accessPayload: JWTTokenPayload = {
        sub: savedUser.id,
        name: userName,
        email: userEmail,
        avatarUrl: avatarUrl ?? undefined,
        plan: savedUser.plan,
        role: savedUser.role,
        inWaitlist: savedUser.inWaitlist,
        provider: "google",
        organization: organizationInfo,
      };

      const refreshPayload = {
        sub: savedUser.id,
        organization: { id: savedOrganization.id },
      };

      await setAuthTokens(c, accessPayload, refreshPayload);

      return c.redirect(c.env.WEB_HOST);
    } catch (error) {
      console.error("Google authentication error:", error);
      return c.json({ error: "Authentication failed" }, 400);
    }
  }
);

auth.get("/protected", jwtMiddleware, (c) => {
  // If jwtAuth passes, user is authenticated
  return c.json({ ok: true }, 200);
});

auth.get("/user", jwtMiddleware, (c) => {
  return c.json({ user: c.get("jwtPayload") });
});

export default auth;
