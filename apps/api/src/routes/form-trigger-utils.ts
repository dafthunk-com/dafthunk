/**
 * Form trigger helpers
 *
 * Pure logic for locating the form-trigger node in a workflow graph and reading
 * its configuration. Kept separate from the route so it can be unit tested.
 */

import type { Node } from "@dafthunk/types";

/** Form trigger node type → public form mode (sync vs async). */
const FORM_TRIGGER_MODE: Record<string, "request" | "webhook"> = {
  "form-request": "request",
  "form-webhook": "webhook",
};

/**
 * A usable schema reference is either a stored schema id (non-empty string) or
 * an inline Schema object (one carrying `fields`). Narrows the value so callers
 * can return it without a cast.
 */
function isValidSchemaRef(
  value: unknown
): value is string | Record<string, unknown> {
  if (typeof value === "string") return value.length > 0;
  return typeof value === "object" && value !== null && "fields" in value;
}

export interface FormTriggerInfo {
  /** "request" → run synchronously; "webhook" → run asynchronously. */
  mode: "request" | "webhook";
  /** Selected schema id, or an inline Schema object. */
  schemaRef: string | Record<string, unknown>;
  title?: string;
  description?: string;
}

/**
 * Finds the form-trigger node in a workflow graph and extracts its config.
 * Returns null when there's no form trigger or its schema isn't set.
 */
export function findFormTrigger(nodes: Node[]): FormTriggerInfo | null {
  const node = nodes.find((n) => FORM_TRIGGER_MODE[n.type] !== undefined);
  if (!node) return null;

  const input = (name: string) =>
    node.inputs.find((i) => i.name === name)?.value;

  const schemaRef = input("schema");
  if (!isValidSchemaRef(schemaRef)) {
    return null;
  }

  const title = input("title");
  const description = input("description");

  return {
    mode: FORM_TRIGGER_MODE[node.type],
    schemaRef,
    ...(typeof title === "string" && title ? { title } : {}),
    ...(typeof description === "string" && description ? { description } : {}),
  };
}

export interface FormResponseInfo {
  /** Graph id of the form-response node, used to read its execution output. */
  nodeId: string;
  /** Selected schema id, or an inline Schema object. */
  schemaRef: string | Record<string, unknown>;
}

/**
 * Finds the `form-response` node in a workflow graph and reads its schema ref.
 * Pairs with `form-request` to define the result shown to the submitter
 * after a synchronous run. Returns null when there's no response node or its
 * schema isn't set.
 */
export function findFormResponse(nodes: Node[]): FormResponseInfo | null {
  const node = nodes.find((n) => n.type === "form-response");
  if (!node) return null;

  const schemaRef = node.inputs.find((i) => i.name === "schema")?.value;
  if (!isValidSchemaRef(schemaRef)) return null;

  return { nodeId: node.id, schemaRef };
}
