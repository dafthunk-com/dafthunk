/// <reference types="@cloudflare/workers-types" />

import { createDatabase, type Env } from "../db";
import { eq } from "drizzle-orm";
import { workflows, type NewWorkflow } from "../db/schema";

export const onRequest: PagesFunction<Env> = async (context) => {
  const db = createDatabase(context.env.DB);

  if (context.request.method === "GET") {
    const allWorkflows = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        createdAt: workflows.createdAt,
        updatedAt: workflows.updatedAt,
      })
      .from(workflows);

    return new Response(JSON.stringify({ workflows: allWorkflows }), {
      headers: {
        "content-type": "application/json",
      },
    });
  }

  if (context.request.method === "POST") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      return new Response("Invalid request body", { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return new Response("Invalid request body", { status: 400 });
    }

    const data = body as any;
    const now = new Date();

    const newWorkflowData: NewWorkflow = {
      id: crypto.randomUUID(),
      name: data.name || "Untitled Workflow",
      data: JSON.stringify({
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : [],
      }),
      createdAt: now,
      updatedAt: now,
    };

    const [newWorkflow] = await db
      .insert(workflows)
      .values(newWorkflowData)
      .returning();
    const workflowData = JSON.parse(newWorkflow.data as string);

    return new Response(
      JSON.stringify({
        id: newWorkflow.id,
        name: newWorkflow.name,
        createdAt: newWorkflow.createdAt,
        updatedAt: newWorkflow.updatedAt,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      }),
      {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }

  return new Response("Method not allowed", { status: 405 });
};
