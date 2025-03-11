/// <reference types="@cloudflare/workers-types" />

import { createDatabase, type Env } from "../../db";
import { eq } from "drizzle-orm";
import { workflows } from "../../db/schema";
import { Workflow, Node, Edge } from "../../src/lib/workflowModel";

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDatabase(context.env.DB);
  const url = new URL(context.request.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return new Response("Workflow ID is required", { status: 400 });
  }

  if (context.request.method === "GET") {
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id));

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

  if (context.request.method === "PUT") {
    const body = (await context.request.json()) as unknown;

    if (typeof body !== "object" || body === null) {
      return new Response("Invalid request body", { status: 400 });
    }

    const data = body as any;
    const now = new Date();

    const [updatedWorkflow] = await db
      .update(workflows)
      .set({
        name: data.name,
        data: {
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          edges: Array.isArray(data.edges) ? data.edges : [],
        },
        updatedAt: now,
      })
      .where(eq(workflows.id, id))
      .returning();

    if (!updatedWorkflow) {
      return new Response("Workflow not found", { status: 404 });
    }

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

  if (context.request.method === "DELETE") {
    const [deletedWorkflow] = await db
      .delete(workflows)
      .where(eq(workflows.id, id))
      .returning();

    if (!deletedWorkflow) {
      return new Response("Workflow not found", { status: 404 });
    }

    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};
