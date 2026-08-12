import {
  FIELD_TYPES,
  type NodeExecution,
  type NodeType,
  type Schema,
} from "@dafthunk/types";

import { createFormToken } from "../../form-token";
import type { NodeContext } from "../../node-types";
import { ExecutableNode } from "../../node-types";

// All field types are valid form inputs; blob types render as file uploads.
const VALID_FIELD_TYPES = new Set<string>(FIELD_TYPES);

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
  public static readonly nodeType: NodeType = {
    id: "create-form",
    name: "Create Form",
    type: "create-form",
    // Named for the job rather than the mechanism, because retrieval scores
    // this text and nobody asks for "a form from a schema" — they ask to have
    // someone review, approve or sign off on something mid-run.
    description:
      "Creates a form for a person to fill in and returns a shareable URL, for asking a human to review, approve or sign off on something mid-run",
    icon: "clipboard-list",
    usage: 0,
    tags: ["Logic", "HITL", "Form", "Approval", "Human"],
    documentation:
      "Turns a schema into a human input form and returns a signed, single-use URL. Blob fields render as file uploads. Pair it with Wait for Form to hold the workflow until someone submits, or use the URL on its own for fire-and-forget collection.",
    inlinable: false,
    asTool: false,
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

  public async execute(context: NodeContext): Promise<NodeExecution> {
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

    let signedToken: string;
    try {
      signedToken = await createFormToken(
        {
          eid: context.executionId,
          wid: context.workflowId,
          tok: token,
        },
        signingKey
      );
    } catch (err) {
      return this.createErrorResult(
        `Failed to sign form token: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const url = `${webHost}/form/${signedToken}`;

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
