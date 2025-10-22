import type { JsonArray, JsonObject, ObjectReference } from "@dafthunk/types";

/**
 * Runtime value types - JSON-serializable values used during workflow execution.
 * These represent the "wire format" that flows between nodes and gets persisted.
 *
 * - Primitives: string, number, boolean
 * - ObjectReference: pointer to binary data in R2 (images, documents, etc.)
 * - JsonArray/JsonObject: structured data
 */
export type RuntimeValue =
  | string
  | number
  | boolean
  | ObjectReference
  | JsonArray
  | JsonObject;

/**
 * Runtime values for a single node.
 * Maps parameter names to their values (single or array for repeated parameters).
 *
 * Example:
 * {
 *   "prompt": "Hello world",
 *   "temperature": 0.7,
 *   "images": [{ id: "...", mimeType: "image/png" }, { id: "...", mimeType: "image/jpeg" }]
 * }
 */
export type NodeRuntimeValues = Record<string, RuntimeValue | RuntimeValue[]>;

/**
 * Runtime state for entire workflow execution.
 * Maps node IDs to their runtime values.
 *
 * Example:
 * Map {
 *   "node-1" => { "text": "output from node 1" },
 *   "node-2" => { "result": 42, "status": "completed" }
 * }
 */
export type WorkflowRuntimeState = Map<string, NodeRuntimeValues>;
