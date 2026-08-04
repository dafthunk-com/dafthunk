import type { InputOverrides } from "@dafthunk/runtime";
import type {
  Workflow,
  WorkflowExample,
  WorkflowTrigger,
} from "@dafthunk/types";
import { CF_LOCKED_KEY } from "@dafthunk/types";

import { NON_LITERAL_PARAMETER_TYPES } from "@dafthunk/utils";

import type { WorkflowExecutorParameters } from "../services/workflow-executor";

/**
 * Reading and writing the input values a workflow can be run against.
 *
 * A workflow's inputs arrive by two routes: `WorkflowExecutor` understands only
 * a trigger-shaped payload, while node values ride the `inputOverrides` channel
 * so they never touch the saved graph. This module builds each separately —
 * they have different producers and only one of them comes from an example.
 */

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") result[key] = entry;
    else if (typeof entry === "number" || typeof entry === "boolean") {
      result[key] = String(entry);
    }
  }
  return result;
}

function encodeJsonBody(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value ?? {}));
}

/**
 * Maps a loosely-shaped payload onto `WorkflowExecutorParameters`.
 *
 * Coerced defensively rather than schema-enforced: the values come either from a
 * user editing a form or from a model whose structured output is prompt-appended
 * rather than decode-constrained, so the shape is a strong suggestion.
 */
export function buildTriggerParameters(
  trigger: WorkflowTrigger,
  sample: Record<string, unknown> | undefined,
  options: { apiHost?: string } = {}
): WorkflowExecutorParameters {
  const value = sample ?? {};

  switch (trigger) {
    case "email_message":
      return {
        from: asString(value.from, "sender@example.com"),
        subject: asString(value.subject, "Sample message"),
        emailBody: asString(
          value.body ?? value.emailBody,
          "This is a sample email body used for the first test run."
        ),
        attachments: Array.isArray(value.attachments) ? value.attachments : [],
      };

    case "http_request":
    case "http_webhook": {
      const body = value.jsonBody ?? value.body ?? {};
      return {
        url: options.apiHost ?? "https://example.com/",
        method: asString(value.method, "POST").toUpperCase(),
        headers: { "content-type": "application/json" },
        query: asRecord(value.query),
        body: {
          data: encodeJsonBody(body),
          mimeType: "application/json",
        },
      };
    }

    case "form_request":
    case "form_webhook": {
      const record = value.formRecord ?? value.form ?? value;
      return {
        formRecord:
          record && typeof record === "object"
            ? (record as Record<string, unknown>)
            : {},
      };
    }

    default:
      // manual, scheduled, queue_message and the bot triggers carry no payload
      // the executor understands; their nodes read from input values instead.
      return {};
  }
}

/**
 * Resolves an example's node values against the current graph.
 *
 * Values are dropped in three cases, all of which are the graph having moved on
 * from the example rather than the example being wrong: the node is gone, the
 * input is gone, or the input is now fed by an edge. That last one matters
 * because an edge always beats a literal at execution time, so applying it would
 * be silently ineffective.
 *
 * The example's own `trigger` payload is not read here. Nothing merges it with
 * the payload the request carried yet, and building one only to discard it would
 * put a `JSON.stringify` on the execution path for no one.
 */
export function buildInputOverrides(
  example: WorkflowExample,
  workflow: Pick<Workflow, "nodes" | "edges">
): InputOverrides {
  const inputOverrides: Record<string, Record<string, unknown>> = {};

  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const connected = new Set(
    workflow.edges.map((edge) => `${edge.target}:${edge.targetInput}`)
  );

  for (const [nodeId, values] of Object.entries(example.nodeValues ?? {})) {
    const node = nodesById.get(nodeId);
    if (!node) continue;

    for (const [inputName, value] of Object.entries(values)) {
      if (!node.inputs.some((input) => input.name === inputName)) continue;
      if (connected.has(`${nodeId}:${inputName}`)) continue;

      inputOverrides[nodeId] ??= {};
      inputOverrides[nodeId][inputName] = value;
    }
  }

  return inputOverrides;
}

/**
 * Captures a graph's current literal input values as example node values.
 *
 * Used when a workflow arrives with sample data already baked into its nodes —
 * the generator does this — so the values become editable test data rather than
 * only defaults buried in the graph.
 *
 * Skips connected inputs (an edge always wins, so a value there would be inert),
 * credential and resource types, and the pinned inputs of a locked node.
 *
 * Deliberately does *not* skip everything marked `hidden`: input-widget nodes
 * like `text-input` mark their value input hidden because the widget renders it
 * inline, and those are exactly the values worth capturing.
 */
export function extractNodeValues(
  workflow: Pick<Workflow, "nodes" | "edges">
): Record<string, Record<string, unknown>> {
  const connected = new Set(
    workflow.edges.map((edge) => `${edge.target}:${edge.targetInput}`)
  );
  const nodeValues: Record<string, Record<string, unknown>> = {};

  for (const node of workflow.nodes) {
    // A locked node pins its own configuration (the model on a
    // `cloudflare-model` node), so its hidden inputs are not the author's to set.
    const isLocked = node.metadata?.[CF_LOCKED_KEY] === "true";

    for (const input of node.inputs) {
      if (input.value === undefined) continue;
      if (NON_LITERAL_PARAMETER_TYPES.has(input.type)) continue;
      if (isLocked && input.hidden) continue;
      if (connected.has(`${node.id}:${input.name}`)) continue;

      nodeValues[node.id] ??= {};
      nodeValues[node.id][input.name] = input.value;
    }
  }

  return nodeValues;
}

/** The example to run: the one asked for, else the default, else none. */
export function selectExample(
  examples: WorkflowExample[],
  exampleId?: string
): WorkflowExample | undefined {
  if (exampleId) return examples.find((example) => example.id === exampleId);
  return examples.find((example) => example.isDefault);
}
