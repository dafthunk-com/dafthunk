import { Context, Hono } from "hono";
import { jwt } from "hono/jwt";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { githubAuth } from "@hono/oauth-providers/github";
import { googleAuth } from "@hono/oauth-providers/google";
import { SignJWT, jwtVerify } from "jose";
import { createDatabase } from "./db";
import { ApiContext, CustomJWTPayload, OrganizationInfo } from "./context";
import { getUserOrganizations, saveUser } from "./utils/db";
import { OrganizationRole } from "./db/schema";

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
export const jwtAuth = (c: Context<ApiContext>, next: () => Promise<void>) => {
  return jwt({
    secret: c.env.JWT_SECRET,
    cookie: JWT_SECRET_TOKEN_NAME,
  })(c, next);
};

// Optional JWT Auth middleware
export const optionalJwtAuth = async (
  c: Context<ApiContext>,
  next: () => Promise<void>
) => {
  const token = getCookie(c, JWT_SECRET_TOKEN_NAME);

  if (token) {
    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      c.set("jwtPayload", payload as CustomJWTPayload);
    } catch (error) {
      // Invalid token, proceed without setting jwtPayload
      // Optionally log the error for debugging
      console.warn("Optional JWT Auth: Invalid token received.", error);
    }
  }
  await next();
};

// Create auth router
const auth = new Hono<ApiContext>();

auth.get("/logout", (c) => {
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
    const { user: savedUser, organization: savedOrganization } = await saveUser(db, userData);

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
    const { user: savedUser, organization: savedOrganization } = await saveUser(db, userData);

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

auth.get("/protected", jwtAuth, (c) => {
  // If jwtAuth passes, user is authenticated
  return c.json({ ok: true }, 200);
});

auth.get("/user", jwtAuth, (c) => {
  return c.json({ user: c.get("jwtPayload") });
});

export default auth;
