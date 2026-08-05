import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * "Tell me about it" — the destination almost every request implies.
 *
 * `send-email` can do this already, but only if someone supplies a recipient,
 * and that is the whole problem: the address has to come from somewhere. A
 * generated workflow either guesses it, bakes in whoever happened to be logged
 * in, or leaves the input blank and fails on the first run. None of those is
 * what "email me the summary" means.
 *
 * So the recipient is not an input at all. It is the organization the workflow
 * belongs to, resolved when it runs — which stays correct when the team
 * changes and carries no personal address into a graph that gets shared.
 */
export class NotifyMeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "notify-me",
    name: "Notify Me",
    type: "notify-me",
    description: "Email everyone in this workspace",
    tags: ["Social", "Email", "Send"],
    icon: "bell",
    documentation:
      "Sends an email to every member of the workspace that owns the workflow. Use this for results meant for you and your team — there is no recipient to fill in, and it keeps working when people join or leave. To email somebody else, use `send-email` instead.",
    usage: 10,
    asTool: true,
    inlinable: false,
    inputs: [
      {
        name: "subject",
        type: "string",
        description: "Subject line",
        required: true,
      },
      {
        name: "text",
        type: "string",
        description: "Body of the message",
        required: true,
      },
    ],
    outputs: [
      {
        name: "recipientCount",
        type: "number",
        description: "How many people were emailed",
        hidden: true,
      },
      {
        name: "error",
        type: "string",
        description: "Error message if sending failed",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { subject, text } = context.inputs;

    if (!subject || !text) {
      return this.createErrorResult("'subject' and 'text' are required.");
    }

    if (!context.organizationService) {
      return this.createErrorResult(
        "This deployment cannot resolve workspace members."
      );
    }

    const sendEmail = context.env.SEND_EMAIL;
    const from = context.env.SEND_EMAIL_FROM;

    if (!sendEmail || !from) {
      return this.createErrorResult(
        "Cloudflare Email Service is not configured (SEND_EMAIL binding or SEND_EMAIL_FROM missing)."
      );
    }

    try {
      const recipients = await context.organizationService.memberEmails(
        context.organizationId
      );

      // An empty list is a failure, not a no-op. Reporting success here would
      // leave someone believing they are being notified when nothing is sent.
      if (recipients.length === 0) {
        return this.createErrorResult(
          "Nobody in this workspace has an email address to send to."
        );
      }

      await sendEmail.send({
        from,
        to: recipients,
        subject: subject as string,
        text: text as string,
      });

      return this.createSuccessResult({ recipientCount: recipients.length });
    } catch (error) {
      console.error("NotifyMe error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
