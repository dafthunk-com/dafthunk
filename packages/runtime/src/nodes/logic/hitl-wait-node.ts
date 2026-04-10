import type { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../../node-types";
import type { NodeContext } from "../../node-types";

/**
 * Pauses workflow execution until a human-in-the-loop form is submitted.
 *
 * Takes a `token` input (from `hitl-form` node) and waits for the
 * corresponding form submission event. When the form is filled,
 * the workflow resumes with the human's response as outputs.
 */
export class HitlWaitNode extends ExecutableNode {
  static readonly nodeType: NodeType = {
    id: "hitl-wait",
    name: "Wait for Form",
    type: "hitl-wait",
    description: "Pauses the workflow until the linked form is submitted",
    icon: "user-check",
    usage: 0,
    tags: ["Logic", "HITL", "Approval"],
    inputs: [
      {
        name: "token",
        description: "Token from the Create Form node",
        type: "string",
        required: true,
      },
    ],
    outputs: [
      {
        name: "response",
        description: "The human's text response",
        type: "string",
      },
      {
        name: "approved",
        description:
          "Whether the human approved or rejected (approve mode only)",
        type: "boolean",
      },
      {
        name: "metadata",
        description: "Optional structured metadata from the response",
        type: "json",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const token = context.inputs.token as string;

    if (!token) {
      return this.createErrorResult(
        "Token is required — connect to a Create Form node"
      );
    }

    if (!context.asyncSupported || !context.executionId) {
      return this.createErrorResult(
        "Wait for Form requires durable workflow execution (not available in worker mode)"
      );
    }

    return {
      nodeId: this.node.id,
      status: "pending",
      usage: 0,
      pendingEvent: {
        type: `hitl-response-${token}`,
        timeout: "24 hours",
      },
    };
  }
}
