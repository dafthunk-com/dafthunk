/// <reference types="@cloudflare/workers-types" />

import { createDatabase } from "../../db";
import { eq, and } from "drizzle-orm";
import { workflows } from "../../db/schema";
import { Node, Edge } from "../../src/lib/server/api/apiTypes";
import { withAuth } from "../auth/middleware";
import { JWTPayload } from "../auth/jwt";

// Extended environment type that includes both DB and JWT_SECRET
interface WorkflowEnv {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequest = withAuth<WorkflowEnv>(async (request, env, user) => {
  const db = createDatabase(env.DB);
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return new Response("Workflow ID is required", { status: 400 });
  }

  if (request.method === "GET") {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

    if (!workflow) {
      return new Response("Workflow not found", { status: 404 });
    }

    const workflowData = workflow.data as { nodes: Node[]; edges: Edge[] };

    return new Response(
      JSON.stringify({
        id: workflow.id,
        name: workflow.name,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        nodes: workflowData.nodes || [],
        edges: workflowData.edges || [],
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }

  if (request.method === "PUT") {
    const body = (await request.json()) as unknown;

    if (typeof body !== "object" || body === null) {
      return new Response("Invalid request body", { status: 400 });
    }

    // First check if the workflow belongs to the user
    const [existingWorkflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

    if (!existingWorkflow) {
      return new Response("Workflow not found", { status: 404 });
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
                    // Don't save values for connected parameters or binary types
                    value:
                      isConnected ||
                      ["audio", "image", "binary"].includes(input.type)
                        ? undefined
                        : input.value,
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

    return new Response(
      JSON.stringify({
        id: updatedWorkflow.id,
        name: updatedWorkflow.name,
        createdAt: updatedWorkflow.createdAt,
        updatedAt: updatedWorkflow.updatedAt,
        nodes: workflowData.nodes || [],
        edges: workflowData.edges || [],
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }

  if (request.method === "DELETE") {
    // First check if the workflow belongs to the user
    const [existingWorkflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, user.sub)));

    if (!existingWorkflow) {
      return new Response("Workflow not found", { status: 404 });
    }

    const [deletedWorkflow] = await db
      .delete(workflows)
      .where(eq(workflows.id, id))
      .returning();

    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
});
