import { Hono } from "hono";
import { createDatabase, type NewWorkflow, type NewUser, users } from "../db";
import { workflows, executions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { githubAuth } from "@hono/oauth-providers/github";
import { jwt } from "hono/jwt";
import { setCookie, deleteCookie } from "hono/cookie";
import {
  createJWT,
  CustomJWTPayload,
  JWT_SECRET_TOKEN_DURATION,
  JWT_SECRET_TOKEN_NAME,
} from "./auth";
import { googleAuth } from "@hono/oauth-providers/google";
import { v4 as uuidv4 } from "uuid";
import { ObjectReference } from "@dafthunk/types";
import {
  Node,
  Edge,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { NodeRegistry } from "./nodes/nodeRegistry";
import { cors } from "hono/cors";
import { Plan, Provider, Role } from "../db/schema";
import { ObjectStore } from "./runtime/store";

export { Runtime } from "./runtime";
import { RuntimeParams } from "./runtime";

export interface Env {
  DB: D1Database;
  EXECUTE: Workflow<RuntimeParams>;
  BUCKET: R2Bucket;
  AI: Ai;
  KV: KVNamespace;

  WEB_HOST: string;

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

const urlToTopLevelDomain = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname.split(".").slice(-2).join(".");
};

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

const jwtAuthMiddleware = (c: any, next: any) => {
  const middleware = jwt({
    secret: c.env.JWT_SECRET,
    cookie: JWT_SECRET_TOKEN_NAME,
  });
  return middleware(c, next);
};

app.get("/auth/protected", jwtAuthMiddleware, async (c) => {
  return c.json({ success: true });
});

app.get("/auth/user", jwtAuthMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  return c.json({ user });
});

app.get("/auth/logout", (c) => {
  deleteCookie(c, JWT_SECRET_TOKEN_NAME, {
    domain: urlToTopLevelDomain(c.env.WEB_HOST),
    path: "/",
  });
  return c.redirect(c.env.WEB_HOST);
});

// Helper function to save or update a user in the database
async function saveUserToDatabase(
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
): Promise<void> {
  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userData.id))
    .get();

  if (existingUser) {
    // Update existing user
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
    // Create new user
    const newUser: NewUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      provider: userData.provider as any,
      githubId: userData.githubId,
      googleId: userData.googleId,
      avatarUrl: userData.avatarUrl,
      plan: (userData.plan as any) || Plan.TRIAL,
      role: (userData.role as any) || Role.USER,
    };

    await db.insert(users).values(newUser);
  }
}

app.get(
  "/auth/login/github",
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

    const userId = user.id?.toString() || "";
    const userName = user.name || user.login || "";
    const userEmail = user.email;
    const avatarUrl = user.avatar_url;

    // Save user to database
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
        plan: "free", // Default plan
        role: "user", // Default role
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

    const userId = user.id?.toString() || "";
    const userName = user.name || "";
    // Use type assertion to handle the email field
    const userEmail = user.email as string | undefined;
    const avatarUrl = user.picture;

    // Save user to database
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
        plan: "free", // Default plan
        role: "user", // Default role
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

app.get("/objects", jwtAuthMiddleware, async (c) => {
  // Handle object retrieval
  const url = new URL(c.req.url);
  const objectId = url.searchParams.get("id");
  const mimeType = url.searchParams.get("mimeType");

  if (!objectId || !mimeType) {
    return c.text("Missing required parameters: id and mimeType", 400);
  }

  let data: Uint8Array | null = null;

  // Use ObjectStore instead of direct R2 access
  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const reference: ObjectReference = {
      id: objectId,
      mimeType: mimeType
    };
    
    try {
      data = await objectStore.readObject(reference);
    } catch (error) {
      console.error("Object retrieval error:", error);
      return c.text(`Object not found: ${objectId}`, 404);
    }
  } catch (error) {
    console.error("ObjectStore initialization error:", error);
    return c.text("Error retrieving object", 500);
  }

  // Return the binary data with the correct content type
  return c.body(data, {
    headers: {
      "content-type": mimeType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
});

app.post("/objects", jwtAuthMiddleware, async (c) => {
  // Handle file upload
  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.text("Content type must be multipart/form-data", 400);
  }

  // Get form data
  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.text("No file provided or invalid file", 400);
  }

  // Get file info
  const mimeType = file.type || "application/octet-stream";
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Use ObjectStore instead of direct R2 access
  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    console.log(`Storing object in ObjectStore (${data.byteLength} bytes)`);
    
    const reference = await objectStore.writeObject(data, mimeType);
    console.log(`Successfully stored object ${reference.id} in ObjectStore`);
    
    // Return the reference
    return c.json({ reference });
  } catch (error) {
    console.error("ObjectStore storage error:", error);
    return c.text("Error storing object", 500);
  }
});

app.get("/types", jwtAuthMiddleware, (c) => {
  try {
    // Get the registry instance with all registered node types
    const registry = NodeRegistry.getInstance();
    return c.json(registry.getNodeTypes());
  } catch (error) {
    console.error("Error in types function:", error);
    return c.json({ error: "Unknown error occurred" }, 500);
  }
});

app.get("/workflows", jwtAuthMiddleware, async (c) => {
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

app.post("/workflows", jwtAuthMiddleware, async (c) => {
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

app.get("/workflows/:id", jwtAuthMiddleware, async (c) => {
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

app.put("/workflows/:id", jwtAuthMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const body = await c.req.json();
  // First check if the workflow belongs to the user
  const [existingWorkflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!existingWorkflow) {
    return c.text("Workflow not found", 404);
  }

  const data = body as any;
  const now = new Date();

  // Validate and sanitize nodes to prevent saving binary data and connected values
  const sanitizedNodes = Array.isArray(data.nodes)
    ? data.nodes.map((node: any) => {
        // Get all edges where this node is the target
        const incomingEdges = Array.isArray(data.edges)
          ? data.edges.filter((edge: any) => edge.target === node.id)
          : [];

        return {
          ...node,
          inputs: Array.isArray(node.inputs)
            ? node.inputs.map((input: any) => {
                // Check if this input is connected to another node
                const isConnected = incomingEdges.some(
                  (edge: any) => edge.targetInput === input.name
                );

                return {
                  ...input,
                  value: isConnected ? undefined : input.value,
                };
              })
            : [],
          outputs: Array.isArray(node.outputs)
            ? node.outputs.map((output: any) => ({
                ...output,
                // Never save output values
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

  const workflowData = updatedWorkflow.data as {
    nodes: Node[];
    edges: Edge[];
  };

  return c.json({
    id: updatedWorkflow.id,
    name: updatedWorkflow.name,
    createdAt: updatedWorkflow.createdAt,
    updatedAt: updatedWorkflow.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  });
});

app.delete("/workflows/:id", jwtAuthMiddleware, async (c) => {
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

  return c.json(
    {
      id: deletedWorkflow.id,
    },
    200
  );
});

app.get("/workflows/:id/execute", jwtAuthMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  // Get monitorProgress from query parameters, default to false if not provided
  const url = new URL(c.req.url);
  const monitorProgress = url.searchParams.get("monitorProgress") === "true";

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as {
    nodes: Node[];
    edges: Edge[];
  };

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

  return c.json({
    id: instance.id,
  });
});

app.get("/executions/:id", jwtAuthMiddleware, async (c) => {
  const id = c.req.param("id");

  try {
    // Get execution data from D1 instead of R2
    const db = createDatabase(c.env.DB);
    const execution = await db
      .select()
      .from(executions)
      .where(eq(executions.id, id))
      .get();

    if (!execution) {
      return c.json({ error: "Execution not found" }, 404);
    }

    // Parse the execution data from the JSON stored in the database
    const executionData = JSON.parse(execution.data as string);

    // Create a WorkflowExecution object from the database record
    const workflowExecution: WorkflowExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status as WorkflowExecutionStatus,
      nodeExecutions: executionData.nodeExecutions || [],
      error: execution.error || undefined,
    };

    return c.json(workflowExecution);
  } catch (error) {
    console.error("Error retrieving execution data:", error);
    return c.json({ error: "Invalid execution data" }, 500);
  }
});

export default {
  fetch: app.fetch,
};
