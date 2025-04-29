import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { setCookie, deleteCookie } from "hono/cookie";
import { githubAuth } from "@hono/oauth-providers/github";
import { googleAuth } from "@hono/oauth-providers/google";
import { SignJWT, JWTPayload } from "jose";
import { eq, and } from "drizzle-orm";

// Internal imports
import {
  createDatabase,
  type NewWorkflow,
  type NewUser,
  users,
  workflows,
  executions,
} from "./db";
import { Plan, Provider, Role } from "./db";
import { NodeRegistry } from "./nodes/nodeRegistry";
import { ObjectStore } from "./runtime/objectStore";
import { RuntimeParams } from "./runtime/runtime";
export { Runtime } from "./runtime/runtime";

import {
  Node,
  Edge,
  WorkflowExecution,
  WorkflowExecutionStatus,
  ObjectReference,
} from "@dafthunk/types";

// Types
interface CustomJWTPayload extends JWTPayload {
  sub: string;
  name: string;
  email?: string;
  provider: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface Env {
  DB: D1Database;
  EXECUTE: Workflow<RuntimeParams>;
  BUCKET: R2Bucket;
  AI: Ai;
  KV: KVNamespace;
  WEB_HOST: string;
  JWT_SECRET: string;
  CLOUDFLARE_ENV: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  SENDGRID_API_KEY: string;
  SENDGRID_DEFAULT_FROM: string;
}

// Constants
const JWT_SECRET_TOKEN_NAME = "auth_token";
const JWT_SECRET_TOKEN_DURATION = 3600; // 1 hour

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
const saveUserToDatabase = async (
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
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userData.id))
    .get();

  if (existingUser) {
    await db
      .update(users)
      .set({
        name: userData.name,
        email: userData.email,
        githubId: userData.githubId,
        googleId: userData.googleId,
        avatarUrl: userData.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userData.id));
  } else {
    const newUser: NewUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      provider: userData.provider as Provider,
      githubId: userData.githubId,
      googleId: userData.googleId,
      avatarUrl: userData.avatarUrl,
      plan: (userData.plan as Plan) || Plan.TRIAL,
      role: (userData.role as Role) || Role.USER,
    };
    await db.insert(users).values(newUser);
  }
};

// Initialize Hono app with types
const app = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload?: CustomJWTPayload };
}>();

// Global middleware
app.use("*", (c, next) =>
  cors({
    origin: c.env.WEB_HOST,
    allowHeaders: [
      "X-Custom-Header",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      ...(c.env.CLOUDFLARE_ENV !== "development"
        ? ["Upgrade-Insecure-Requests"]
        : []),
    ],
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Content-Type-Options"],
    maxAge: 600,
    credentials: true,
  })(c, next)
);

// Auth middleware
const jwtAuth = (c: any, next: any) => {
  const middleware = jwt({
    secret: c.env.JWT_SECRET,
    cookie: JWT_SECRET_TOKEN_NAME,
  });
  return middleware(c, next);
};

// Health check
app.get("/health", (c) =>
  c.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
);

// Auth routes
app.get("/auth/protected", jwtAuth, (c) => c.json({ success: true }));
app.get("/auth/user", jwtAuth, (c) => c.json({ user: c.get("jwtPayload") }));

app.get("/auth/logout", (c) => {
  deleteCookie(c, JWT_SECRET_TOKEN_NAME, {
    domain: urlToTopLevelDomain(c.env.WEB_HOST),
    path: "/",
  });
  return c.redirect(c.env.WEB_HOST);
});

// OAuth routes
app.get(
  "/auth/login/github",
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
    await saveUserToDatabase(db, {
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

app.get(
  "/auth/login/google",
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
    await saveUserToDatabase(db, {
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

// Object storage routes
app.get("/objects", jwtAuth, async (c) => {
  const url = new URL(c.req.url);
  const objectId = url.searchParams.get("id");
  const mimeType = url.searchParams.get("mimeType");

  if (!objectId || !mimeType) {
    return c.text("Missing required parameters: id and mimeType", 400);
  }

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const reference: ObjectReference = { id: objectId, mimeType };
    const data = await objectStore.readObject(reference);

    return c.body(data, {
      headers: {
        "content-type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Object retrieval error:", error);
    return c.text("Object not found", 404);
  }
});

app.post("/objects", jwtAuth, async (c) => {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.text("Content type must be multipart/form-data", 400);
  }

  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.text("No file provided or invalid file", 400);
  }

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const reference = await objectStore.writeObject(
      data,
      file.type || "application/octet-stream"
    );

    return c.json({ reference });
  } catch (error) {
    console.error("Object storage error:", error);
    return c.text("Error storing object", 500);
  }
});

// Node types route
app.get("/types", jwtAuth, (c) => {
  try {
    const registry = NodeRegistry.getInstance();
    return c.json(registry.getNodeTypes());
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

// Workflow routes
app.get("/workflows", jwtAuth, async (c) => {
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

  return c.json({ workflows: allWorkflows });
});

app.post("/workflows", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const data = await c.req.json();
  const now = new Date();

  const newWorkflowData: NewWorkflow = {
    id: crypto.randomUUID(),
    name: data.name || "Untitled Workflow",
    data: JSON.stringify({
      nodes: Array.isArray(data.nodes) ? data.nodes : [],
      edges: Array.isArray(data.edges) ? data.edges : [],
    }),
    userId: user.sub,
    createdAt: now,
    updatedAt: now,
  };

  const db = createDatabase(c.env.DB);
  const [newWorkflow] = await db
    .insert(workflows)
    .values(newWorkflowData)
    .returning();
  const workflowData = JSON.parse(newWorkflow.data as string);

  return c.json(
    {
      id: newWorkflow.id,
      name: newWorkflow.name,
      createdAt: newWorkflow.createdAt,
      updatedAt: newWorkflow.updatedAt,
      nodes: workflowData.nodes,
      edges: workflowData.edges,
    },
    201
  );
});

app.get("/workflows/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!workflow) {
    return c.text("Workflow not found", 404);
  }

  const workflowData = workflow.data as { nodes: Node[]; edges: Edge[] };

  return c.json({
    id: workflow.id,
    name: workflow.name,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  });
});

app.put("/workflows/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const [existingWorkflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!existingWorkflow) {
    return c.text("Workflow not found", 404);
  }

  const data = await c.req.json();
  const now = new Date();

  // Sanitize nodes to prevent saving binary data and connected values
  const sanitizedNodes = Array.isArray(data.nodes)
    ? data.nodes.map((node: any) => {
        const incomingEdges = Array.isArray(data.edges)
          ? data.edges.filter((edge: any) => edge.target === node.id)
          : [];

        return {
          ...node,
          inputs: Array.isArray(node.inputs)
            ? node.inputs.map((input: any) => ({
                ...input,
                value: incomingEdges.some(
                  (edge: any) => edge.targetInput === input.name
                )
                  ? undefined
                  : input.value,
              }))
            : [],
          outputs: Array.isArray(node.outputs)
            ? node.outputs.map((output: any) => ({
                ...output,
                value: undefined,
              }))
            : [],
        };
      })
    : [];

  const [updatedWorkflow] = await db
    .update(workflows)
    .set({
      name: data.name,
      data: {
        nodes: sanitizedNodes,
        edges: Array.isArray(data.edges) ? data.edges : [],
      },
      updatedAt: now,
    })
    .where(eq(workflows.id, id))
    .returning();

  const workflowData = updatedWorkflow.data as { nodes: Node[]; edges: Edge[] };

  return c.json({
    id: updatedWorkflow.id,
    name: updatedWorkflow.name,
    createdAt: updatedWorkflow.createdAt,
    updatedAt: updatedWorkflow.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  });
});

app.delete("/workflows/:id", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const [existingWorkflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!existingWorkflow) {
    return c.text("Workflow not found", 404);
  }

  const [deletedWorkflow] = await db
    .delete(workflows)
    .where(eq(workflows.id, id))
    .returning();

  return c.json({ id: deletedWorkflow.id });
});

app.get("/workflows/:id/execute", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const monitorProgress =
    new URL(c.req.url).searchParams.get("monitorProgress") === "true";
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as { nodes: Node[]; edges: Edge[] };
  const instance = await c.env.EXECUTE.create({
    params: {
      userId: user.sub,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      monitorProgress,
    },
  });

  return c.json({ id: instance.id });
});

app.get("/executions/:id", jwtAuth, async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  try {
    const execution = await db
      .select()
      .from(executions)
      .where(eq(executions.id, id))
      .get();

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    const executionData = JSON.parse(execution.data as string);
    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
    };

    return c.json(workflowExecution);
  } catch (error) {
    console.error("Error retrieving execution:", error);
    return c.json({ error: "Failed to retrieve execution" }, 500);
  }
});

export default {
  fetch: app.fetch,
};
