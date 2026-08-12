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
  public static readonly nodeType: NodeType = {
    id: "create-feedback-form",
    name: "Create Feedback Form",
    type: "create-feedback-form",
    description:
      "Creates a public page where a person can review workflow outputs against evaluation criteria and give feedback, without pausing the run",
    icon: "message-circle-question",
    usage: 0,
    tags: ["Logic", "HITL", "Feedback", "Review", "Human"],
    documentation:
      "Builds a public feedback page from a title and description and returns its signed URL. Unlike Create Form, the workflow does not pause: the URL is emitted and execution continues, so downstream nodes can deliver it by email, Slack or Discord while the run finishes.",
    inlinable: false,
    asTool: false,
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

  public async execute(context: NodeContext): Promise<NodeExecution> {
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

    let signedToken: string;
    try {
      signedToken = await createFormToken(
        {
          eid: context.executionId,
          wid: context.workflowId,
          tok: token,
          org: context.organizationId,
        },
        signingKey
      );
    } catch (err) {
      return this.createErrorResult(
        `Failed to sign form token: ${err instanceof Error ? err.message : String(err)}`
      );
    }

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
