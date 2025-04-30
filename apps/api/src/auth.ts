import { Context, Hono } from "hono";
import { jwt } from "hono/jwt";
import { setCookie, deleteCookie } from "hono/cookie";
import { githubAuth } from "@hono/oauth-providers/github";
import { googleAuth } from "@hono/oauth-providers/google";
import { SignJWT } from "jose";
import {
  Provider,
  Plan,
  Role,
  users,
  type ProviderType,
  type PlanType,
  type RoleType,
} from "./db";
import { createDatabase } from "./db";
import { ApiContext, CustomJWTPayload } from "./context";

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

// Database helper functions
const saveUser = async (
  db: ReturnType<typeof createDatabase>,
  userData: {
    id: string;
    name: string;
    email?: string;
    provider: string;
    githubId?: string;
    googleId?: string;
    avatarUrl?: string;
    plan?: string;
    role?: string;
  }
): Promise<void> => {
  const now = new Date();
  await db
    .insert(users)
    .values({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      provider: userData.provider as ProviderType,
      githubId: userData.githubId,
      googleId: userData.googleId,
      avatarUrl: userData.avatarUrl,
      plan: (userData.plan as PlanType) || Plan.TRIAL,
      role: (userData.role as RoleType) || Role.USER,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        name: userData.name,
        email: userData.email,
        githubId: userData.githubId,
        googleId: userData.googleId,
        avatarUrl: userData.avatarUrl,
        plan: (userData.plan as PlanType) || Plan.TRIAL,
        role: (userData.role as RoleType) || Role.USER,
        updatedAt: now,
      },
    });
};

// Auth middleware
export const jwtAuth = (c: Context<ApiContext>, next: () => Promise<void>) => {
  return jwt({
    secret: c.env.JWT_SECRET,
    cookie: JWT_SECRET_TOKEN_NAME,
  })(c, next);
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
    const userEmail = user.email;
    const avatarUrl = user.avatar_url;

    const db = createDatabase(c.env.DB);
    await saveUser(db, {
      id: userId,
      name: userName,
      email: userEmail ?? undefined,
      provider: Provider.GITHUB,
      githubId: userId,
      avatarUrl,
      plan: Plan.FREE,
      role: Role.USER,
    });

    const jwtToken = await createJWT(
      {
        sub: userId,
        name: userName,
        email: userEmail ?? undefined,
        provider: "github",
        avatarUrl,
        plan: "free",
        role: "user",
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
    await saveUser(db, {
      id: userId,
      name: userName,
      email: userEmail,
      provider: Provider.GOOGLE,
      googleId: userId,
      avatarUrl,
      plan: Plan.FREE,
      role: Role.USER,
    });

    const jwtToken = await createJWT(
      {
        sub: userId,
        name: userName,
        email: userEmail,
        provider: "google",
        avatarUrl: avatarUrl || undefined,
        plan: "free",
        role: "user",
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
