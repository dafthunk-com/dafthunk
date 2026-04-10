import type { NodeExecution, NodeType } from "@dafthunk/types";

import { createHitlToken } from "../../hitl-token";
import { ExecutableNode } from "../../node-types";
import type { NodeContext } from "../../node-types";

/**
 * Creates a human-in-the-loop form and generates a unique, signed URL.
 *
 * The URL can be sent to a user via email, SMS, Discord, etc. using
 * downstream nodes. Pair with `hitl-wait` to pause the workflow until
 * the form is submitted.
 */
export class HitlFormNode extends ExecutableNode {
  static readonly nodeType: NodeType = {
    id: "hitl-form",
    name: "Create Form",
    type: "hitl-form",
    description: "Creates a human input form and generates a shareable URL",
    icon: "clipboard-list",
    usage: 0,
    tags: ["Logic", "HITL", "Form"],
    inputs: [
      {
        name: "prompt",
        description: "Question or instruction shown to the user",
        type: "string",
        required: true,
      },
      {
        name: "context",
        description: "Additional context displayed on the form",
        type: "string",
        required: false,
      },
      {
        name: "input_type",
        description: "Type of input to collect: text, approve, or json",
        type: "string",
        required: false,
        hidden: true,
        value: "text",
        enum: ["text", "approve", "json"],
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
    const prompt = (context.inputs.prompt as string) || "";
    const inputContext = context.inputs.context as string | undefined;
    const inputType = (context.inputs.input_type as string) || "text";

    if (!prompt) {
      return this.createErrorResult("Prompt is required");
    }

    if (!context.executionId) {
      return this.createErrorResult(
        "Create Form requires workflow execution (not available in worker mode)"
      );
    }

    const signingKey = context.env.HITL_SIGNING_KEY;
    const webHost = context.env.WEB_HOST;

    if (!signingKey || !webHost) {
      return this.createErrorResult(
        "HITL configuration missing (HITL_SIGNING_KEY or WEB_HOST)"
      );
    }

    const token = crypto.randomUUID();

    const signedToken = await createHitlToken(
      {
        eid: context.executionId,
        wid: context.workflowId,
        tok: token,
        p: prompt,
        c: inputContext,
        t: inputType,
      },
      signingKey
    );

    const url = `${webHost}/f/${signedToken}`;

    return this.createSuccessResult({ url, token }, 0);
  }
}
