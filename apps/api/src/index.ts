import { Hono } from "hono";
import { NodeRegistry } from "./nodes/nodeRegistry";
import { createDatabase } from "../db";
import { workflows } from "../db/schema";
import { eq } from "drizzle-orm";
import { githubAuth } from "@hono/oauth-providers/github";
import { jwt } from "hono/jwt";
import { setCookie } from "hono/cookie";
import {
  createJWT,
  CustomJWTPayload,
  JWT_SECRET_TOKEN_DURATION,
} from "./lib/auth";
import { googleAuth } from "@hono/oauth-providers/google";
export { ExecuteWorkflow } from "./workflows/execute";

export interface Env {
  DB: D1Database;
  EXECUTE: Workflow;
  BUCKET: R2Bucket;
  AI: Ai;

  CLOUDFLARE_ENV: string;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

const app = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload?: CustomJWTPayload };
}>();

const jwtAuthMiddleware = (c: any, next: any) => {
  const middleware = jwt({
    secret: c.env.JWT_SECRET,
    cookie: "auth_token",
  });
  return middleware(c, next);
};

app.get(
  "/auth/github",
  // Middleware
  (c, next) => {
    const githubAuthHandler = githubAuth({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      scope: ["read:user", "user:email"],
      oauthApp: true,
    });
    return githubAuthHandler(c, next);
  },
  // Callback
  async (c) => {
    // const token = c.get("token");
    // const refreshToken = c.get("refresh-token");
    const user = c.get("user-github");

    if (!user) {
      return c.json({ error: "No user data received from GitHub" }, 400);
    }

    const jwtToken = await createJWT(
      {
        sub: user.id?.toString() || "",
        name: user.name || user.login || "",
        email: user.email ?? undefined,
        provider: "github",
        avatarUrl: user.avatar_url,
        plan: "free", // Default plan
        role: "user", // Default role
      },
      c.env.JWT_SECRET
    );

    setCookie(c, "auth_token", jwtToken, {
      httpOnly: true,
      secure: c.env.CLOUDFLARE_ENV !== "development",
      sameSite: "Strict",
      maxAge: JWT_SECRET_TOKEN_DURATION,
      path: "/",
    });
    return c.redirect("/");
  }
);

app.get(
  "/auth/google",
  // Middleware
  (c, next) => {
    const googleAuthHandler = googleAuth({
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      scope: ["openid", "email", "profile"],
    });
    return googleAuthHandler(c, next);
  },
  // Callback
  async (c) => {
    // const token = c.get("token");
    // const grantedScopes = c.get("granted-scopes");
    const user = c.get("user-google");

    if (!user) {
      return c.json({ error: "No user data received from Google" }, 400);
    }

    const jwtToken = await createJWT(
      {
        sub: user.id?.toString() || "",
        name: user.name || "",
        email: user.email || undefined,
        provider: "google",
        avatarUrl: user.picture || undefined,
        plan: "free", // Default plan
        role: "user", // Default role
      },
      c.env.JWT_SECRET
    );

    setCookie(c, "auth_token", jwtToken, {
      httpOnly: true,
      secure: c.env.CLOUDFLARE_ENV !== "development",
      sameSite: "Strict",
      maxAge: JWT_SECRET_TOKEN_DURATION,
      path: "/",
    });
    return c.redirect("/");
  }
);

app.get("/api/types", jwtAuthMiddleware, (c) => {
  return c.json(NodeRegistry.getInstance().getNodeTypes());
});

app.get("/api/workflows", jwtAuthMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;

  const db = createDatabase(c.env.DB);
  const allWorkflows = await db
    .select({
      id: workflows.id,
      name: workflows.name,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
    })
    .from(workflows)
    .where(eq(workflows.userId, user.sub));
  return c.json(allWorkflows);
});

export default {
  fetch: app.fetch,
};
