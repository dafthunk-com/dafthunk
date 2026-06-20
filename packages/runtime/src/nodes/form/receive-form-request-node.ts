import type { NodeType } from "@dafthunk/types";

import { ReceiveFormNode } from "./receive-form-base";

/**
 * Synchronous form trigger. A public form (rendered from the schema) starts the
 * workflow inline; the submitter waits for completion. Mirrors `http-request`.
 *
 * Outputs are derived from the selected schema by the editor widget — each
 * field becomes a typed output (blob fields surface as ObjectReferences).
 */
export class ReceiveFormRequestNode extends ReceiveFormNode {
  public static readonly nodeType: NodeType = {
    id: "receive-form-request",
    name: "Receive Form Request",
    type: "receive-form-request",
    description:
      "Receives a form submission and executes the workflow synchronously.",
    documentation:
      "Renders a public form from the selected schema. On submit, the workflow runs synchronously (the submitter waits for completion). Select a schema and the node's outputs adapt to its fields.",
    tags: ["Form", "Parameter", "HITL"],
    icon: "clipboard-list",
    inlinable: true,
    trigger: true,
    inputs: [
      {
        name: "schema",
        type: "schema",
        description: "Schema defining the form fields",
        required: true,
        hidden: true,
      },
      {
        name: "title",
        type: "string",
        description: "Form title shown to the user",
        required: false,
      },
      {
        name: "description",
        type: "string",
        description: "Optional description displayed below the title",
        required: false,
      },
    ],
    outputs: [],
  };
}
