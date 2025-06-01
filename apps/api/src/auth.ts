import { githubAuth } from "@hono/oauth-providers/github";
import { googleAuth } from "@hono/oauth-providers/google";
import { Context, Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { jwt } from "hono/jwt";
import { SignJWT } from "jose";

import { ApiContext, CustomJWTPayload, OrganizationInfo } from "./context";
import { createDatabase, OrganizationRole, saveUser, verifyApiKey } from "./db";
// Constants
const JWT_SECRET_TOKEN_NAME = "auth_token";
const JWT_SECRET_TOKEN_DURATION = 3600;

// Utility functions
const createJWT = async (
  payload: CustomJWTPayload,
  jwtSecret: string
): Promise<string> => {
  const secret = new TextEncoder().encode(jwtSecret);
  const expirationTime =
    Math.floor(Date.now() / 1000) + JWT_SECRET_TOKEN_DURATION;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
};

const urlToTopLevelDomain = (url: string): string => {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname.split(".").slice(-2).join(".");
};

// Auth middleware
export const jwtMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  await jwt({
    secret: c.env.JWT_SECRET,
    cookie: JWT_SECRET_TOKEN_NAME,
  })(c, async () => {});

  const payload = c.get("jwtPayload") as CustomJWTPayload | undefined;
  if (!payload || !payload.organization.id) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const allowedPaths = [
    "/auth/login/github",
    "/auth/login/google",
    "/auth/user",
    "/auth/logout",
  ];
  if (payload.inWaitlist && !allowedPaths.includes(c.req.path)) {
    return c.json(
      { error: "Access denied. You are currently on our waitlist." },
      403
    );
  }
  c.set("organizationId", payload.organization.id);
  await next();
};

// API key authentication middleware
export const apiKeyMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "API key is required" }, 401);
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  const db = createDatabase(c.env.DB);

  const organizationId = await verifyApiKey(db, apiKey);

  if (!organizationId) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  // Store the organization ID in the context for later use
  c.set("organizationId", organizationId);

  await next();
};

// Middleware that allows either JWT or API key authentication
export const apiKeyOrJwtMiddleware = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const authHeader = c.req.header("Authorization");

  // If Authorization header is present, try API key auth
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return apiKeyMiddleware(c, next);
  }

  // Otherwise, use JWT auth
  return jwtMiddleware(c, next);
};

// Create auth router
const auth = new Hono<ApiContext>();

auth.post("/logout", (c) => {
  deleteCookie(c, JWT_SECRET_TOKEN_NAME, {
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
      return c.json({ error: "No user data received from GitHub" }, 400);
    }

    const userId = user.id?.toString() || "";
    const userName = user.name || user.login || "";
    const userEmail = user.email || undefined;
    const avatarUrl = user.avatar_url;

    const db = createDatabase(c.env.DB);

    // Save user and create organization if needed
    const userData = {
      id: userId,
      name: userName,
      email: userEmail,
      provider: "github" as const,
      githubId: userId,
      avatarUrl,
    };
    const { user: savedUser, organization: savedOrganization } = await saveUser(
      db,
      userData
    );

    const organizationInfo: OrganizationInfo = {
      id: savedOrganization.id,
      name: savedOrganization.name,
      handle: savedOrganization.handle,
      role: OrganizationRole.OWNER,
    };

    const jwtToken = await createJWT(
      {
        sub: userId,
        name: userName,
        email: userEmail ?? undefined,
        provider: "github",
        avatarUrl,
        plan: savedUser.plan,
        role: savedUser.role,
        inWaitlist: savedUser.inWaitlist,
        organization: organizationInfo,
      },
      c.env.JWT_SECRET
    );

    setCookie(c, JWT_SECRET_TOKEN_NAME, jwtToken, {
      httpOnly: true,
      secure: c.env.CLOUDFLARE_ENV !== "development",
      sameSite: "Lax",
      domain: urlToTopLevelDomain(c.env.WEB_HOST),
      maxAge: JWT_SECRET_TOKEN_DURATION,
      path: "/",
    });

    return c.redirect(c.env.WEB_HOST);
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
      return c.json({ error: "No user data received from Google" }, 400);
    }

    const userId = user.id?.toString() || "";
    const userName = user.name || "";
    const userEmail = user.email as string | undefined;
    const avatarUrl = user.picture;

    const db = createDatabase(c.env.DB);

    // Save user and create organization if needed
    const userData = {
      id: userId,
      name: userName,
      email: userEmail,
      provider: "google" as const,
      googleId: userId,
      avatarUrl,
    };
    const { user: savedUser, organization: savedOrganization } = await saveUser(
      db,
      userData
    );

    const organizationInfo: OrganizationInfo = {
      id: savedOrganization.id,
      name: savedOrganization.name,
      handle: savedOrganization.handle,
      role: OrganizationRole.OWNER,
    };

    const jwtToken = await createJWT(
      {
        sub: userId,
        name: userName,
        email: userEmail,
        provider: "google",
        avatarUrl: avatarUrl || undefined,
        plan: savedUser.plan,
        role: savedUser.role,
        inWaitlist: savedUser.inWaitlist,
        organization: organizationInfo,
      },
      c.env.JWT_SECRET
    );

    setCookie(c, JWT_SECRET_TOKEN_NAME, jwtToken, {
      httpOnly: true,
      secure: c.env.CLOUDFLARE_ENV !== "development",
      sameSite: "Lax",
      domain: urlToTopLevelDomain(c.env.WEB_HOST),
      maxAge: JWT_SECRET_TOKEN_DURATION,
      path: "/",
    });

    return c.redirect(c.env.WEB_HOST);
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
