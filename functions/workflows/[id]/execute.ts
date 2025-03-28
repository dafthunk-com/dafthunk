/// <reference types="@cloudflare/workers-types" />

import { createDatabase } from "../../../db";
import { eq, and } from "drizzle-orm";
import { workflows } from "../../../db/schema";
import {
  Node,
  Edge,
  WorkflowExecutionOptions,
} from "../../../src/lib/server/api/apiTypes";
import { Workflow } from "../../../src/lib/server/runtime/runtimeTypes";
import { Runtime } from "../../../src/lib/server/runtime/runtime";
import { withAuth } from "../../auth/middleware";
import { JWTPayload, Env } from "../../auth/jwt";
import { NodeRegistry } from "../../../src/lib/server/runtime/runtimeRegistries";
import { ApiParameterRegistry } from "../../../src/lib/server/api/apiRegistries";

// Helper function to create an SSE event
function createEvent(event: {
  type:
    | "node-start"
    | "node-complete"
    | "node-error"
    | "execution-complete"
    | "execution-error"
    | "validation-error";
  nodeId?: string;
  error?: string;
  data?: any;
  timestamp: number;
}): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  );
}

// The main handler function that will be wrapped with authentication
async function executeWorkflow(
  request: Request,
  env: Env,
  user: JWTPayload
): Promise<Response> {
  // Only allow GET requests
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 2];

    if (!id) {
      return new Response("Workflow ID is required", { status: 400 });
    }

    const db = createDatabase(env.DB);
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

    const apiParameterRegistry = ApiParameterRegistry.getInstance();
    const workflowData = workflow.data as { nodes: Node[]; edges: Edge[] };
    const workflowGraph: Workflow = {
      id: workflow.id,
      name: workflow.name,
      nodes: workflowData.nodes
        ? apiParameterRegistry.convertApiNodes(workflowData.nodes)
        : [],
      edges: workflowData.edges || [],
    };

    // Check if user is on free plan and workflow contains AI nodes
    if (user.plan === "free") {
      const registry = NodeRegistry.getInstance();
      const nodeTypes = apiParameterRegistry.convertNodeTypes(
        registry.getRuntimeNodeTypes()
      );

      const aiNodeTypes = new Set(
        nodeTypes
          .filter((type) => type.category === "AI")
          .map((type) => type.type)
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
    const runtime = new Runtime(workflowGraph, executionOptions, env);

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

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: unknown) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to execute workflow",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Export the protected endpoint using the withAuth middleware
export const onRequest: PagesFunction<Env> = withAuth(executeWorkflow);
