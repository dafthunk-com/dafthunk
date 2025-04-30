import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { Node, Edge } from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase, workflows, type NewWorkflow } from "../db";
import { jwtAuth } from "../auth";

const workflowRoutes = new Hono<ApiContext>();

workflowRoutes.get("/", jwtAuth, async (c) => {
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

workflowRoutes.post("/", jwtAuth, async (c) => {
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

workflowRoutes.get("/:id", jwtAuth, async (c) => {
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

workflowRoutes.put("/:id", jwtAuth, async (c) => {
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

workflowRoutes.delete("/:id", jwtAuth, async (c) => {
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

workflowRoutes.get("/:id/execute", jwtAuth, async (c) => {
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

export default workflowRoutes;
