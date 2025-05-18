import { Node, NodeExecution, NodeType, ParameterType } from "@dafthunk/types";
import { ForwardableEmailMessage, Headers } from "@cloudflare/workers-types";
import { ExecutableNode, NodeContext } from "../types";

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode(); // Flush any remaining bytes
  return result;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    record[key] = value;
  }
  return record;
}

export class EmailParameterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "parameter-email",
    name: "Email Parameter",
    type: "parameter-email",
    description:
      "Extracts from, to, headers, and raw content from an incoming email.",
    category: "Parameter",
    icon: "mail", // Assuming 'mail' is a valid icon option
    inputs: [], // No inputs needed as it consumes the email object directly from context
    outputs: [
      {
        name: "from",
        type: "string",
        description: "The sender's email address.",
      },
      {
        name: "to",
        type: "string",
        description: "The recipient's email address.",
      },
      {
        name: "headers",
        type: "json",
        description: "Email headers as a JSON object.",
      },
      {
        name: "raw",
        type: "string",
        description: "The raw email content as a string.",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.emailMessage) {
        throw new Error(
          "Email message information is required but not provided in the context."
        );
      }

      const { from, to, headers: emailHeaders, raw: rawStream } = context.emailMessage as ForwardableEmailMessage;

      const rawContent = await streamToString(rawStream);
      const headersObject = headersToRecord(emailHeaders);

      return this.createSuccessResult({
        from,
        to,
        headers: headersObject,
        raw: rawContent,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
} 