import type { NodeType } from "@dafthunk/types";

import { FormTriggerNode } from "./form-trigger-base";

/**
 * Asynchronous form trigger. A public form (rendered from the schema) starts the
 * workflow in the background; the submitter gets an immediate confirmation.
 * Mirrors `http-webhook`.
 *
 * Outputs are derived from the selected schema by the editor widget — each
 * field becomes a typed output (blob fields surface as ObjectReferences).
 */
export class FormWebhookNode extends FormTriggerNode {
  public static readonly nodeType: NodeType = {
    id: "form-webhook",
    name: "Form Webhook",
    type: "form-webhook",
    description:
      "Receives a form submission and executes the workflow asynchronously.",
    documentation:
      "Renders a public form from the selected schema. On submit, the workflow runs asynchronously and the submitter sees an immediate confirmation. Select a schema and the node's outputs adapt to its fields.",
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
