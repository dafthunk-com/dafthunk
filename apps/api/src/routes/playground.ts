import type {
  ExecuteNodeResponse,
  Node,
  ParameterValue,
} from "@dafthunk/types";
import { Hono } from "hono";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { CloudflareCredentialService } from "../runtime/credential-service";
import type { WorkflowExecutionContext } from "../runtime/execution-types";
import { CloudflareObjectStore } from "../runtime/object-store";
import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../runtime/parameter-mapper";

const playgroundRoutes = new Hono<ApiContext>();

playgroundRoutes.post("/", jwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;

  // Parse and validate request body
  const body = await c.req.json<{
    nodeType: string;
    inputs: Record<string, unknown>;
  }>();

  if (!body.nodeType || typeof body.nodeType !== "string") {
    return c.json({ error: "nodeType is required" }, 400);
  }

  // Look up node type from registry
  const nodeRegistry = new CloudflareNodeRegistry(c.env, false);
  let nodeType;
  try {
    nodeType = nodeRegistry.getNodeType(body.nodeType);
  } catch {
    return c.json({ error: `Unknown node type: ${body.nodeType}` }, 400);
  }

  // Build a synthetic Node object for the executable
  const syntheticNode: Node = {
    id: "playground",
    name: nodeType.name,
    type: nodeType.type,
    position: { x: 0, y: 0 },
    inputs: nodeType.inputs.map((input) => ({
      ...input,
      value: body.inputs?.[input.name] ?? input.value,
    })),
    outputs: nodeType.outputs.map((output) => ({ ...output })),
  };

  // Create executable node
  const executable = nodeRegistry.createExecutableNode(syntheticNode);
  if (!executable) {
    return c.json({ error: `Cannot execute node type: ${body.nodeType}` }, 400);
  }

  // Set up credential service and object store
  // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
  let credentialService: CloudflareCredentialService;
  const toolRegistry = new CloudflareToolRegistry(
    nodeRegistry,
    (nodeId: string, inputs: Record<string, unknown>) =>
      credentialService.createToolContext(nodeId, inputs)
  );
  credentialService = new CloudflareCredentialService(c.env, toolRegistry);
  await credentialService.initialize(organizationId);

  const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);

  // Transform API inputs to node-level values
  const nodeInputs: Record<string, unknown> = {};
  for (const inputDef of nodeType.inputs) {
    const apiValue = body.inputs?.[inputDef.name] ?? inputDef.value;
    if (apiValue !== undefined && apiValue !== null) {
      const converted = await apiToNodeParameter(
        inputDef.type,
        apiValue as ParameterValue,
        objectStore
      );
      nodeInputs[inputDef.name] = converted;
    }
  }

  // Build execution context
  const syntheticContext: WorkflowExecutionContext = {
    workflow: {
      id: "playground",
      name: "Playground",
      handle: "playground",
      trigger: "manual",
      nodes: [syntheticNode],
      edges: [],
    },
    executionLevels: [{ nodeIds: ["playground"] }],
    orderedNodeIds: ["playground"],
    workflowId: "playground",
    organizationId,
    executionId: `playground_${Date.now()}`,
  };

  const nodeContext = credentialService.createNodeContext(
    "playground",
    syntheticContext,
    nodeInputs
  );

  // Execute the node
  try {
    const result = await executable.execute(nodeContext);

    if (result.status === "error") {
      const response: ExecuteNodeResponse = {
        status: "error",
        error: result.error,
        usage: result.usage ?? 0,
      };
      return c.json(response);
    }

    // Transform node outputs back to API values
    const apiOutputs: Record<string, ParameterValue> = {};
    if (result.outputs) {
      for (const outputDef of nodeType.outputs) {
        const nodeValue = result.outputs[outputDef.name];
        if (nodeValue !== undefined && nodeValue !== null) {
          const converted = await nodeToApiParameter(
            outputDef.type,
            nodeValue,
            objectStore,
            organizationId
          );
          if (converted !== undefined) {
            apiOutputs[outputDef.name] = converted;
          }
        }
      }
    }

    const response: ExecuteNodeResponse = {
      status: "completed",
      outputs: apiOutputs,
      usage: result.usage ?? 1,
    };
    return c.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown execution error";
    const response: ExecuteNodeResponse = {
      status: "error",
      error: message,
      usage: 0,
    };
    return c.json(response);
  }
});

export default playgroundRoutes;
