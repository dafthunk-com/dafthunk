import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { NodeContext } from "../../node-types";
import { ExecutableNode } from "../../node-types";

/**
 * Pauses workflow execution until a human-in-the-loop form is submitted.
 *
 * Takes a `token` input (from `create-form` node) and waits for the
 * corresponding form submission event. When the form is filled,
 * the workflow resumes with the submitted data as a JSON output.
 */
export class WaitForFormNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "wait-for-form",
    name: "Wait for Form",
    type: "wait-for-form",
    description:
      "Pauses the workflow until a person submits the linked form, so a run can wait for someone to approve or review its work before continuing",
    icon: "user-check",
    usage: 0,
    tags: ["Logic", "HITL", "Approval", "Human"],
    documentation:
      "Suspends the workflow on the token emitted by Create Form and resumes when that form is submitted, for up to 24 hours. Suspension is durable, so the run survives restarts while it waits. Requires durable workflow execution — it cannot run in worker mode.",
    inlinable: false,
    asTool: false,
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
        description: "The submitted form data as a JSON object",
        type: "json",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
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
        type: `form-response-${token}`,
        timeout: "24 hours",
      },
    };
  }
}
