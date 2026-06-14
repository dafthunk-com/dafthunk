import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Reads the message history of a mailbox thread so a workflow can craft a
 * context-aware reply. Defaults to the thread of the triggering email.
 */
export class GetEmailThreadNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "get-email-thread",
    name: "Get Email Thread",
    type: "get-email-thread",
    description:
      "Retrieves the prior messages of a mailbox conversation thread.",
    tags: ["Social", "Email", "Receive"],
    icon: "mail",
    documentation:
      "Returns the messages of a mailbox thread in chronological order. When no thread is provided, it uses the thread of the email that triggered the workflow. Requires a persisted per-org mailbox address.",
    asTool: true,
    inputs: [
      {
        name: "threadId",
        type: "string",
        description:
          "Thread to read. Defaults to the thread of the triggering email.",
        required: false,
      },
    ],
    outputs: [
      {
        name: "messages",
        type: "json",
        description:
          "Messages in the thread (chronological): direction, from, to, subject, snippet, timestamps.",
      },
      {
        name: "subject",
        type: "string",
        description: "Subject of the thread.",
      },
      {
        name: "count",
        type: "number",
        description: "Number of messages in the thread.",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const threadId =
        (context.inputs.threadId as string | undefined) ??
        context.emailMessage?.threadId;

      if (!threadId) {
        return this.createErrorResult(
          "No thread id provided and the workflow was not triggered by a mailbox email."
        );
      }

      if (!context.mailboxService) {
        return this.createErrorResult(
          "Mailbox service is not available in this context."
        );
      }

      const [messages, thread] = await Promise.all([
        context.mailboxService.listThreadMessages(
          threadId,
          context.organizationId
        ),
        context.mailboxService.getThread(threadId, context.organizationId),
      ]);

      return this.createSuccessResult({
        messages,
        subject: thread?.subject ?? "",
        count: messages.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
