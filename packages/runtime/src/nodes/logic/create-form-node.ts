import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";

import { createFormToken } from "../../form-token";
import type { NodeContext } from "../../node-types";
import { ExecutableNode } from "../../node-types";

const VALID_FIELD_TYPES = new Set([
  "string",
  "integer",
  "number",
  "boolean",
  "datetime",
  "json",
]);

/**
 * Creates a human-in-the-loop form and generates a unique, signed URL.
 *
 * The form fields are defined by a schema. The schema is stored in the
 * WorkflowAgent DO and fetched by the form page at render time.
 *
 * The URL can be sent to a user via email, SMS, Discord, etc. using
 * downstream nodes. Pair with `wait-for-form` to pause the workflow until
 * the form is submitted.
 */
export class CreateFormNode extends ExecutableNode {
  static readonly nodeType: NodeType = {
    id: "create-form",
    name: "Create Form",
    type: "create-form",
    description:
      "Creates a human input form from a schema and generates a shareable URL",
    icon: "clipboard-list",
    usage: 0,
    tags: ["Logic", "HITL", "Form"],
    inputs: [
      {
        name: "title",
        description: "Form title shown to the user",
        type: "string",
        required: true,
      },
      {
        name: "description",
        description: "Optional description displayed below the title",
        type: "string",
        required: false,
      },
      {
        name: "schema",
        description: "Schema defining the form fields",
        type: "schema",
        required: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "url",
        description: "Shareable URL for the human input form",
        type: "string",
      },
      {
        name: "token",
        description: "Unique token to pass to the Wait for Form node",
        type: "string",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const title = (context.inputs.title as string) || "";
    const description = context.inputs.description as string | undefined;
    const schema = context.inputs.schema as Schema | undefined;

    if (!title) {
      return this.createErrorResult("Title is required");
    }

    if (!schema || !schema.fields || schema.fields.length === 0) {
      return this.createErrorResult(
        "Schema with at least one field is required"
      );
    }

    if (!context.executionId) {
      return this.createErrorResult(
        "Create Form requires workflow execution (not available in worker mode)"
      );
    }

    const signingKey = context.env.FORM_SIGNING_KEY;
    const webHost = context.env.WEB_HOST;

    if (!signingKey || !webHost) {
      return this.createErrorResult(
        "Form configuration missing (FORM_SIGNING_KEY or WEB_HOST)"
      );
    }

    // Validate field types
    for (const field of schema.fields) {
      if (!field.name || !field.type) {
        return this.createErrorResult(
          `Each schema field must have a "name" and "type". Got: ${JSON.stringify(field)}`
        );
      }
      if (!VALID_FIELD_TYPES.has(field.type)) {
        return this.createErrorResult(
          `Invalid field type "${field.type}" for field "${field.name}". Supported: ${[...VALID_FIELD_TYPES].join(", ")}`
        );
      }
    }

    const token = crypto.randomUUID();

    const signedToken = await createFormToken(
      {
        eid: context.executionId,
        wid: context.workflowId,
        tok: token,
      },
      signingKey
    );

    const url = `${webHost}/f/${signedToken}`;

    return this.createSuccessResult(
      {
        url,
        token,
        schema: JSON.stringify({
          title,
          description,
          fields: schema.fields,
        }),
      },
      0
    );
  }
}
