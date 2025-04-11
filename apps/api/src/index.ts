import { Hono } from "hono";
import { createDatabase, type NewWorkflow } from "../db";
import { workflows } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { githubAuth } from "@hono/oauth-providers/github";
import { jwt } from "hono/jwt";
import { setCookie } from "hono/cookie";
import {
  createJWT,
  CustomJWTPayload,
  JWT_SECRET_TOKEN_DURATION,
} from "./lib/auth";
import { googleAuth } from "@hono/oauth-providers/google";
import { v4 as uuidv4 } from "uuid";
import { ObjectReference, ObjectStore } from "./lib/old/runtime/store";
import {
  Edge,
  Node,
  WorkflowExecutionOptions,
} from "@dafthunk/runtime/api/types";
import { ParameterRegistry } from "./lib/old/api/parameterRegistry";
import { Workflow as RuntimeWorkflow } from "./lib/old/runtime/types";
import { NodeRegistry } from "./lib/old/runtime/nodeRegistry";
import { Runtime } from "./lib/old/runtime/runtime";
import { createEvent } from "./lib/sse";
import { cors } from "hono/cors";

export { ExecuteWorkflow } from "./workflows/execute";

export interface Env {
  DB: D1Database;
  EXECUTE: Workflow;
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

app.use("*", (c, next) =>
  cors({
    origin: [c.env.WEB_HOST, "https://github.com"],
    allowHeaders: [
      "X-Custom-Header",
      "Authorization",
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      ...(c.env.CLOUDFLARE_ENV === "production"
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
    cookie: "auth_token",
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

app.get(
  "/auth/login/github",
  // Middleware
  (c, next) => {
    const githubAuthHandler = githubAuth({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      scope: ["read:user", "user:email"],
      oauthApp: true,
      // redirect_uri: `${c.env.WEB_HOST}/auth/callback/github`,
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
  return c.json(NodeRegistry.getInstance().getNodeTypes());
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
  return c.json(allWorkflows);
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

app.post("/workflows/:id/execute", jwtAuthMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

  if (!workflow) {
    return new Response(JSON.stringify({ error: "Workflow not found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const parameterRegistry = ParameterRegistry.getInstance();
  const workflowData = workflow.data as { nodes: Node[]; edges: Edge[] };
  const workflowGraph: RuntimeWorkflow = {
    id: workflow.id,
    name: workflow.name,
    nodes: workflowData.nodes
      ? parameterRegistry.convertApiNodes(workflowData.nodes)
      : [],
    edges: workflowData.edges || [],
  };

  // Check if user is on free plan and workflow contains AI nodes
  if (user.plan === "free") {
    const registry = NodeRegistry.getInstance();
    const nodeTypes = parameterRegistry.convertNodeTypes(
      registry.getNodeTypes()
    );

    const aiNodeTypes = new Set(
      nodeTypes.filter((type) => type.category === "AI").map((type) => type.id)
    );

    const hasAINodes = workflowGraph.nodes.some((node) =>
      aiNodeTypes.has(node.type)
    );

    if (hasAINodes) {
      return new Response(
        JSON.stringify({
          error:
            "AI nodes are not available in the free plan. Please upgrade to use AI features.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }

  // Create a TransformStream for SSE with Uint8Array chunks
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();

  // Create an AbortController to handle client disconnections
  const abortController = new AbortController();
  const { signal } = abortController;

  // Safe write function to detect client disconnections
  async function safeWrite(data: Uint8Array): Promise<void> {
    try {
      await writer.write(data);
    } catch (error) {
      console.error("Client disconnected:", error);
      abortController.abort();
      try {
        await writer.close();
      } catch (e) {
        // Ignore errors on close after disconnection
      }
    }
  }

  // Create execution options that emit SSE events
  const executionOptions: WorkflowExecutionOptions = {
    onNodeStart: (nodeId) => {
      if (signal.aborted) return;
      safeWrite(
        createEvent({
          type: "node-start",
          nodeId,
          timestamp: Date.now(),
        })
      );
    },
    onNodeComplete: (nodeId, outputs) => {
      if (signal.aborted) return;
      safeWrite(
        createEvent({
          type: "node-complete",
          nodeId,
          data: { outputs },
          timestamp: Date.now(),
        })
      );
    },
    onNodeError: (nodeId, error) => {
      if (signal.aborted) return;
      safeWrite(
        createEvent({
          type: "node-error",
          nodeId,
          error,
          timestamp: Date.now(),
        })
      );
    },
    onExecutionComplete: async () => {
      if (signal.aborted) return;
      try {
        await safeWrite(
          createEvent({
            type: "execution-complete",
            timestamp: Date.now(),
          })
        );
        await writer.close();
      } catch (error) {
        console.log("Error closing writer on execution complete:", error);
      }
    },
    onExecutionError: async (error) => {
      if (signal.aborted) return;
      try {
        await safeWrite(
          createEvent({
            type: "execution-error",
            error,
            timestamp: Date.now(),
          })
        );
        await writer.close();
      } catch (e) {
        console.log("Error closing writer on execution error:", e);
      }
    },
    abortSignal: signal, // Pass the abort signal to the runtime
  };

  // Create and execute the workflow runtime
  const objectStore = new ObjectStore(c.env.BUCKET as any);

  const runtime = new Runtime(
    workflowGraph,
    executionOptions,
    c.env,
    objectStore
  );

  // Execute the workflow in the background
  runtime.execute().catch(async (error) => {
    console.error("Runtime execution error:", error);
    // The error will be handled by the onExecutionError callback
    if (!signal.aborted) {
      try {
        await safeWrite(
          createEvent({
            type: "execution-error",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: Date.now(),
          })
        );
        await writer.close();
      } catch (e) {
        // Ignore errors on close after error
      }
    }
  });

  return c.body(readable, {
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
