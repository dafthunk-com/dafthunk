/// <reference types="@cloudflare/workers-types" />

import { createDatabase } from "../../../db";
import { eq } from "drizzle-orm";
import { workflows } from "../../../db/schema";
import {
  Workflow,
  Node,
  Edge,
  ValidationError,

} from "../../../src/lib/workflowTypes";
import { WorkflowExecutionOptions, WorkflowRuntime } from "../../../src/lib/workflowRuntime";
import { withAuth } from "../../auth/middleware";
import { JWTPayload, Env } from "../../auth/jwt";

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
      .where(eq(workflows.id, id));

    if (!workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // The data field is already parsed by Drizzle ORM
    const workflowData = workflow.data as { nodes: Node[]; edges: Edge[] };
    const workflowGraph: Workflow = {
      id: workflow.id,
      name: workflow.name,
      nodes: workflowData.nodes || [],
      edges: workflowData.edges || [],
    };

    // Create a TransformStream for SSE with Uint8Array chunks
    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    // Create execution options that emit SSE events
    const executionOptions: WorkflowExecutionOptions = {
      onNodeStart: (nodeId) => {
        writer.write(
          createEvent({
            type: "node-start",
            nodeId,
            timestamp: Date.now(),
          })
        );
      },
      onNodeComplete: (nodeId, outputs) => {
        writer.write(
          createEvent({
            type: "node-complete",
            nodeId,
            data: { outputs },
            timestamp: Date.now(),
          })
        );
      },
      onNodeError: (nodeId, error) => {
        writer.write(
          createEvent({
            type: "node-error",
            nodeId,
            error,
            timestamp: Date.now(),
          })
        );
      },
      onExecutionComplete: () => {
        writer
          .write(
            createEvent({
              type: "execution-complete",
              timestamp: Date.now(),
            })
          )
          .then(() => writer.close());
      },
      onExecutionError: (error) => {
        writer
          .write(
            createEvent({
              type: "execution-error",
              error,
              timestamp: Date.now(),
            })
          )
          .then(() => writer.close());
      },
    };

    // Create and execute the workflow runtime
    const runtime = new WorkflowRuntime(workflowGraph, executionOptions, env);

    // Execute the workflow in the background
    runtime.execute().catch(async (error) => {
      console.error("Runtime execution error:", error);
      // The error will be handled by the onExecutionError callback
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
