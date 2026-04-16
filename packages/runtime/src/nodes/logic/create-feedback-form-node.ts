import type { NodeExecution, NodeType } from "@dafthunk/types";

import { createFormToken } from "../../form-token";
import type { NodeContext } from "../../node-types";
import { ExecutableNode } from "../../node-types";

/**
 * Creates a public feedback page for the current workflow execution.
 *
 * The page displays the execution's node outputs on one side and the
 * workflow's evaluation criteria on the other. Submitters are anonymous;
 * the signed token in the URL IS the authorization.
 *
 * Unlike `create-form`, this node does not pause the workflow — it emits
 * the URL and completes immediately so downstream nodes can keep running.
 *
 * Pair with notification nodes (email, Discord, Slack, …) to deliver the
 * URL to reviewers.
 */
export class CreateFeedbackFormNode extends ExecutableNode {
  static readonly nodeType: NodeType = {
    id: "create-feedback-form",
    name: "Create Feedback Form",
    type: "create-feedback-form",
    description:
      "Creates a public feedback page showing workflow outputs and evaluation criteria",
    icon: "message-circle-question",
    usage: 0,
    tags: ["Logic", "HITL", "Feedback"],
    inputs: [
      {
        name: "title",
        description: "Page title shown to the reviewer",
        type: "string",
        required: true,
      },
      {
        name: "description",
        description: "Optional description displayed below the title",
        type: "string",
        required: false,
      },
    ],
    outputs: [
      {
        name: "url",
        description: "Shareable URL for the feedback page",
        type: "string",
      },
      {
        name: "token",
        description: "Unique token identifying this feedback page",
        type: "string",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const title = (context.inputs.title as string) || "";
    const description = context.inputs.description as string | undefined;

    if (!title) {
      return this.createErrorResult("Title is required");
    }

    if (!context.executionId) {
      return this.createErrorResult(
        "Create Feedback Form requires workflow execution (not available in worker mode)"
      );
    }

    const signingKey = context.env.FORM_SIGNING_KEY;
    const webHost = context.env.WEB_HOST;

    if (!signingKey || !webHost) {
      return this.createErrorResult(
        "Form configuration missing (FORM_SIGNING_KEY or WEB_HOST)"
      );
    }

    const token = crypto.randomUUID();

    const signedToken = await createFormToken(
      {
        eid: context.executionId,
        wid: context.workflowId,
        tok: token,
        org: context.organizationId,
      },
      signingKey
    );

    const url = `${webHost}/feedback/${signedToken}`;

    return this.createSuccessResult(
      {
        url,
        token,
        feedbackFormConfig: JSON.stringify({ title, description }),
      },
      0
    );
  }
}
