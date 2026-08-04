import type {
  ListWorkflowExamplesResponse,
  WorkflowExample,
  WorkflowExampleResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { CloudflareObjectStore } from "../runtime/cloudflare-object-store";
import { collectObjectReferences, ExampleStore } from "../stores/example-store";
import { WorkflowStore } from "../stores/workflow-store";
import {
  applyDefaultExclusivity,
  checkName,
  checkNewExample,
  checkUpload,
  ensureDefault,
} from "./example-rules";

const exampleRoutes = new Hono<ApiContext>();

exampleRoutes.use("*", jwtMiddleware);

/**
 * Confirms the workflow named in the path belongs to the caller's organization.
 *
 * Middleware rather than a call inside each handler: the workflow id is a path
 * parameter, so a handler that forgot the check would serve another
 * organization's examples. Structural beats remembered.
 */
exampleRoutes.use("*", async (c, next) => {
  const organizationId = c.get("organizationId");
  const workflowId = c.req.param("workflowId");

  if (!organizationId || !workflowId) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflow = await new WorkflowStore(c.env).get(
    workflowId,
    organizationId
  );
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  await next();
});

const valuesSchema = z.record(z.string(), z.record(z.string(), z.unknown()));

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  nodeValues: valuesSchema.optional(),
  trigger: z.record(z.string(), z.unknown()).optional(),
  expectation: z.string().max(2000).optional(),
});

const updateSchema = createSchema.partial();

exampleRoutes.get("/", async (c) => {
  const examples = await new ExampleStore(c.env).list(
    c.req.param("workflowId")!
  );
  return c.json({ examples } satisfies ListWorkflowExamplesResponse);
});

exampleRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const workflowId = c.req.param("workflowId")!;
  const body = c.req.valid("json");

  const store = new ExampleStore(c.env);
  const examples = await store.list(workflowId);

  const failure = checkNewExample(examples, body.name);
  if (failure) return c.json({ error: failure.message }, failure.status);

  const now = new Date();
  const example: WorkflowExample = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description,
    // The first example becomes the default, so a workflow that has any
    // examples always has one Run can use without being told which.
    isDefault: body.isDefault ?? examples.length === 0,
    nodeValues: body.nodeValues ?? {},
    trigger: body.trigger,
    expectation: body.expectation,
    createdAt: now,
    updatedAt: now,
  };

  const next = example.isDefault
    ? applyDefaultExclusivity([...examples, example], example.id)
    : [...examples, example];

  await store.save(workflowId, next);
  return c.json({ example } satisfies WorkflowExampleResponse, 201);
});

exampleRoutes.patch(
  "/:exampleId",
  zValidator("json", updateSchema),
  async (c) => {
    const workflowId = c.req.param("workflowId")!;
    const exampleId = c.req.param("exampleId")!;
    const body = c.req.valid("json");

    const store = new ExampleStore(c.env);
    const examples = await store.list(workflowId);
    const index = examples.findIndex((example) => example.id === exampleId);

    if (index === -1) {
      return c.json({ error: "Example not found" }, 404);
    }

    const failure = checkName(examples, body.name, exampleId);
    if (failure) return c.json({ error: failure.message }, failure.status);

    // The spread already keeps every field the body omitted; only identity and
    // timestamps are pinned so a client cannot rewrite them.
    const updated: WorkflowExample = {
      ...examples[index],
      ...body,
      id: examples[index].id,
      createdAt: examples[index].createdAt,
      updatedAt: new Date(),
    };

    let next = [...examples];
    next[index] = updated;
    if (updated.isDefault) next = applyDefaultExclusivity(next, updated.id);

    await store.save(workflowId, next);
    return c.json({ example: updated } satisfies WorkflowExampleResponse);
  }
);

exampleRoutes.delete("/:exampleId", async (c) => {
  const workflowId = c.req.param("workflowId")!;
  const exampleId = c.req.param("exampleId")!;

  const store = new ExampleStore(c.env);
  const examples = await store.list(workflowId);
  const doomed = examples.find((example) => example.id === exampleId);

  if (!doomed) {
    return c.json({ error: "Example not found" }, 404);
  }

  const remaining = ensureDefault(
    examples.filter((example) => example.id !== exampleId)
  );

  // Objects referenced only by the deleted example have to go explicitly —
  // nothing garbage-collects them. Anything a surviving example still points at
  // is kept.
  const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
  const stillUsed = new Set(
    collectObjectReferences(remaining).map((reference) => reference.id)
  );

  // Concurrent: N blobs would otherwise be N serial R2 round trips before the
  // caller sees a response. Best-effort — a failed blob must not block the save.
  await Promise.all(
    collectObjectReferences([doomed])
      .filter((reference) => !stillUsed.has(reference.id))
      .map(async (reference) => {
        try {
          await objectStore.deleteObject(reference);
        } catch (error) {
          console.error(
            `Failed to delete example object ${reference.id}:`,
            error
          );
        }
      })
  );

  await store.save(workflowId, remaining);
  return c.json({ success: true });
});

/**
 * Uploads a file to be used as one blob-typed input value.
 *
 * Uses the form upload rules rather than the general object endpoint, which caps
 * nothing and trusts the client's declared MIME type outright.
 */
exampleRoutes.post("/:exampleId/objects", async (c) => {
  const organizationId = c.get("organizationId")!;
  const workflowId = c.req.param("workflowId")!;
  const exampleId = c.req.param("exampleId")!;

  const store = new ExampleStore(c.env);
  const examples = await store.list(workflowId);
  const index = examples.findIndex((example) => example.id === exampleId);
  if (index === -1) {
    return c.json({ error: "Example not found" }, 404);
  }

  const form = await c.req.formData();
  const file = form.get("file");
  const nodeId = form.get("nodeId");
  const inputName = form.get("inputName");

  if (!(file instanceof File)) {
    return c.json({ error: "Expected a 'file' part" }, 400);
  }
  if (typeof nodeId !== "string" || typeof inputName !== "string") {
    return c.json({ error: "Expected 'nodeId' and 'inputName' parts" }, 400);
  }

  // The declared input type is what the upload is checked against, so the graph
  // has to be consulted rather than trusting the caller.
  const workflowData = await new WorkflowStore(c.env).getWithData(
    workflowId,
    organizationId
  );
  const input = workflowData?.data?.nodes
    ?.find((node: { id: string }) => node.id === nodeId)
    ?.inputs?.find(
      (parameter: { name: string }) => parameter.name === inputName
    );

  if (!input) {
    return c.json({ error: `No input ${nodeId}.${inputName}` }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  const failure = checkUpload(bytes.byteLength, mimeType, input.type);
  if (failure) return c.json({ error: failure.message }, failure.status);

  const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
  const reference = await objectStore.writeObject(
    bytes,
    mimeType,
    organizationId,
    // No executionId: an example's files outlive any single run.
    undefined,
    file.name || undefined
  );

  const example = examples[index];
  const next = [...examples];
  next[index] = {
    ...example,
    nodeValues: {
      ...example.nodeValues,
      [nodeId]: { ...example.nodeValues[nodeId], [inputName]: reference },
    },
    updatedAt: new Date(),
  };

  await store.save(workflowId, next);
  return c.json({ reference, example: next[index] }, 201);
});

export default exampleRoutes;
