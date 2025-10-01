import {
  WorkflowAckMessage,
  WorkflowErrorMessage,
  WorkflowInitMessage,
  WorkflowState,
  WorkflowType,
  WorkflowUpdateMessage,
} from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, getWorkflow, updateWorkflow } from "../db";

const wsRoutes = new Hono<ApiContext>();

// WebSocket endpoint for real-time workflow state synchronization
wsRoutes.get("/", jwtMiddleware, async (c) => {
  const upgradeHeader = c.req.header("Upgrade");

  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket connection" }, 426);
  }

  const userId = c.var.jwtPayload?.sub;
  const workflowId = c.req.query("workflowId");
  const organizationId = c.get("organizationId")!;

  if (!userId || !workflowId || !organizationId) {
    console.error("Missing userId, workflowId or organizationId:", {
      userId,
      workflowId,
      organizationId,
    });
    return c.json(
      { error: "Missing userId, workflowId or organizationId" },
      400
    );
  }

  // Load workflow from database
  const db = createDatabase(c.env.DB);
  let workflow;
  try {
    workflow = await getWorkflow(db, workflowId, organizationId);
  } catch (error) {
    console.error("Error loading workflow:", error);
    return c.json({ error: "Failed to load workflow" }, 500);
  }

  // Create WebSocket pair
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the WebSocket connection
  server.accept();

  // Prepare initial state
  const initialState: WorkflowState = workflow
    ? {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        type: ((workflow.data as any).type || "manual") as WorkflowType,
        nodes: (workflow.data as any).nodes || [],
        edges: (workflow.data as any).edges || [],
        timestamp: workflow.updatedAt
          ? workflow.updatedAt.getTime()
          : Date.now(),
      }
    : {
        id: workflowId,
        name: "New Workflow",
        handle: workflowId,
        type: "manual" as WorkflowType,
        nodes: [],
        edges: [],
        timestamp: Date.now(),
      };

  // Send initial state
  const initMessage: WorkflowInitMessage = {
    type: "init",
    state: initialState,
  };
  server.send(JSON.stringify(initMessage));

  // Handle incoming messages
  server.addEventListener("message", async (event: MessageEvent) => {
    try {
      if (typeof event.data !== "string") {
        const errorMsg: WorkflowErrorMessage = {
          error: "Expected string message",
        };
        server.send(JSON.stringify(errorMsg));
        return;
      }

      const data = JSON.parse(event.data);

      if ("type" in data && data.type === "update") {
        const updateMsg = data as WorkflowUpdateMessage;

        // Update workflow in database
        try {
          // Fetch the latest workflow to avoid using stale initialState captured at connection time
          const currentWorkflow = await getWorkflow(
            db,
            workflowId,
            organizationId
          );
          if (!currentWorkflow) {
            const errorMsg: WorkflowErrorMessage = {
              error: "Workflow not found",
            };
            server.send(JSON.stringify(errorMsg));
            return;
          }

          const currentData = currentWorkflow.data as any;

          await updateWorkflow(db, workflowId, organizationId, {
            data: {
              id: workflowId,
              name: currentData.name || currentWorkflow.name,
              handle: currentData.handle || currentWorkflow.handle,
              type: currentData.type || "manual",
              nodes: updateMsg.nodes,
              edges: updateMsg.edges,
            },
          });

          // Send acknowledgment
          const ackMsg: WorkflowAckMessage = {
            type: "ack",
            timestamp: Date.now(),
          };
          server.send(JSON.stringify(ackMsg));
        } catch (error) {
          console.error("Error updating workflow:", error);
          const errorMsg: WorkflowErrorMessage = {
            error: "Failed to update workflow",
            details: error instanceof Error ? error.message : "Unknown error",
          };
          server.send(JSON.stringify(errorMsg));
        }
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      const errorMsg: WorkflowErrorMessage = {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      server.send(JSON.stringify(errorMsg));
    }
  });

  // Handle errors
  server.addEventListener("error", (event: Event) => {
    console.error("WebSocket error:", event);
  });

  // Handle close
  server.addEventListener("close", (event: CloseEvent) => {
    console.log("WebSocket closed:", event.code, event.reason);
  });

  // Return response with WebSocket
  return new Response(null, {
    status: 101,
    webSocket: client,
  });
});

export default wsRoutes;
