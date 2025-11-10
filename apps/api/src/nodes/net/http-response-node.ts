import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class HttpResponseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "http-response",
    name: "HTTP Response",
    type: "http-response",
    description:
      "Define the HTTP response for synchronous HTTP Request workflows.",
    tags: ["Network", "HTTP", "Response"],
    icon: "arrow-left",
    compatibility: ["http_request"], // Only compatible with sync HTTP workflows
    documentation:
      "This node defines the HTTP response to be returned when using a synchronous HTTP Request trigger. " +
      "It allows you to set the status code and body content that will be sent back to the HTTP client.",
    inputs: [
      {
        name: "statusCode",
        type: "number",
        description: "HTTP status code (e.g., 200, 404, 500)",
        value: 200,
      },
      {
        name: "body",
        type: "string",
        description: "Response body content",
      },
    ],
    outputs: [
      {
        name: "statusCode",
        type: "number",
        description: "HTTP status code",
      },
      {
        name: "body",
        type: "string",
        description: "Response body",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { statusCode = 200, body = "" } = context.inputs;

    // Validate status code
    if (
      typeof statusCode !== "number" ||
      statusCode < 100 ||
      statusCode > 599
    ) {
      return this.createErrorResult(
        "Status code must be a number between 100 and 599"
      );
    }

    return this.createSuccessResult({
      statusCode,
      body,
    });
  }
}
