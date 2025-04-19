import { Hono } from "hono";
import { createDatabase, type NewWorkflow, type NewUser, users } from "../db";
import { workflows } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { githubAuth } from "@hono/oauth-providers/github";
import { jwt } from "hono/jwt";
import { setCookie, deleteCookie } from "hono/cookie";
import {
  createJWT,
  CustomJWTPayload,
  JWT_SECRET_TOKEN_DURATION,
  JWT_SECRET_TOKEN_NAME,
} from "./lib/auth";
import { googleAuth } from "@hono/oauth-providers/google";
import { v4 as uuidv4 } from "uuid";
import { ObjectReference } from "./lib/runtime/store";
import { Node as ApiNode, Edge as ApiEdge } from "./lib/api/types";
import { NodeRegistry } from "./lib/nodes/nodeRegistry";
import { cors } from "hono/cors";
import { Plan, Provider, Role } from "../db/schema";
import { createEvent } from "./lib/sse";

export { ExecuteWorkflow } from "./workflows/execute";
import { ExecuteWorkflowParams } from "./workflows/execute";

export interface Env {
  DB: D1Database;
  EXECUTE: Workflow<ExecuteWorkflowParams>;
  BUCKET: R2Bucket;
  AI: Ai;

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

  // Try to get from R2 if available
  try {
    const object = await c.env.BUCKET.get(`objects/${objectId}`);
    if (object) {
      const arrayBuffer = await object.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    }
  } catch (error) {
    console.error("R2 retrieval error:", error);
    return c.text("Error retrieving object", 500);
  }

  if (!data) {
    return c.text(`Object not found: ${objectId}`, 404);
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

  // Generate a unique ID for the object
  const id = uuidv4();
  try {
    // Store in R2
    console.log(`Storing object ${id} in R2 (${data.byteLength} bytes)`);
    await c.env.BUCKET.put(`objects/${id}`, data, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
      },
    });
    console.log(`Successfully stored object ${id} in R2`);
  } catch (error) {
    console.error("R2 storage error:", error);
    return c.text("Error storing object", 500);
  }

  // Create the reference
  const reference: ObjectReference = {
    id,
    mimeType,
  };

  // Return the reference
  return c.json({ reference });
});

app.get("/types", jwtAuthMiddleware, (c) => {
  try {
    // Get the registry instance with all registered node types
    const registry = NodeRegistry.getInstance();
    return c.json(registry.getApiNodeTypes());
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

  const workflowData = workflow.data as { nodes: ApiNode[]; edges: ApiEdge[] };

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
    nodes: ApiNode[];
    edges: ApiEdge[];
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

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as {
    nodes: ApiNode[];
    edges: ApiEdge[];
  };

  // Check if user is on free plan and workflow contains AI nodes
  if (user.plan === "free") {
    const hasAINodes = workflowData.nodes.some(
      (node) =>
        node.type === "AI Text to Image" ||
        node.type === "AI Chat Completion" ||
        node.type === "AI Vision"
    );

    if (hasAINodes) {
      return c.json(
        {
          error:
            "AI nodes are not available in the free plan. Please upgrade to use AI features.",
        },
        403
      );
    }
  }

  let instance: Awaited<ReturnType<typeof c.env.EXECUTE.create>>;
  try {
    instance = await c.env.EXECUTE.create({
      params: {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
      },
    });
  } catch (error) {
    console.error("Error creating workflow instance:", error);
    return c.json({ error: "Failed to start workflow execution" }, 500);
  }

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sentNodeEvents = new Set<string>();
      const pollInterval = 1000;

      const pollStatus = async () => {
        try {
          const status = await instance.status();

          if (status.output) {
            const output = status.output as any;
            if (output.executedNodes) {
              for (const nodeId of output.executedNodes) {
                if (!sentNodeEvents.has(nodeId)) {
                  if (output.nodeOutputs && output.nodeOutputs[nodeId]) {
                    controller.enqueue(
                      createEvent({
                        type: "node-complete",
                        nodeId,
                        data: { outputs: output.nodeOutputs[nodeId] },
                        timestamp: Date.now(),
                      })
                    );
                    sentNodeEvents.add(nodeId);
                  }
                }
              }
            }
            if (output.errors) {
              for (const nodeId in output.errors) {
                if (!sentNodeEvents.has(nodeId)) {
                  controller.enqueue(
                    createEvent({
                      type: "node-error",
                      nodeId,
                      error: output.errors[nodeId],
                      timestamp: Date.now(),
                    })
                  );
                  sentNodeEvents.add(nodeId);
                }
              }
            }
          }

          if (
            status.status === "complete" ||
            status.status === "errored" ||
            status.status === "terminated"
          ) {
            if (intervalId) clearInterval(intervalId);

            if (status.status === "complete") {
              controller.enqueue(
                createEvent({
                  type: "execution-complete",
                  timestamp: Date.now(),
                })
              );
            } else {
              controller.enqueue(
                createEvent({
                  type: "execution-error",
                  error:
                    status.error ||
                    (status.status === "terminated"
                      ? "Workflow terminated by user"
                      : "Unknown execution error"),
                  timestamp: Date.now(),
                })
              );
            }
            controller.close();

            // Dispose the instance stub
            instance.terminate();
          } else if (
            status.status === "queued" ||
            status.status === "running" ||
            status.status === "paused" ||
            status.status === "waiting" ||
            status.status === "waitingForPause"
          ) {
          } else {
            console.warn("Unknown workflow instance status:", status.status);
            if (intervalId) clearInterval(intervalId);
            controller.enqueue(
              createEvent({
                type: "execution-error",
                error: `Unknown workflow state: ${status.status}`,
                timestamp: Date.now(),
              })
            );
            controller.close();
          }
        } catch (error) {
          console.error("Polling error:", error);
          if (intervalId) clearInterval(intervalId);
          try {
            controller.enqueue(
              createEvent({
                type: "execution-error",
                error:
                  error instanceof Error ? error.message : "Polling failed",
                timestamp: Date.now(),
              })
            );
            controller.close();
          } catch (e) {}
        }
      };

      // Start polling
      intervalId = setInterval(pollStatus, pollInterval);

      // Initial poll right away
      await pollStatus();
    },
    cancel(reason) {
      console.log("Stream cancelled:", reason);
      // Cleanup polling interval when the stream is cancelled
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null; // Prevent further calls
        console.log("Polling stopped due to stream cancellation.");
        // Dispose the instance
        instance.terminate();
      }
    },
  });

  return c.body(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default {
  fetch: app.fetch,
};
