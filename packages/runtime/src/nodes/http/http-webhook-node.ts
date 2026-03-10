import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class HttpWebhookNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "http-webhook",
    name: "HTTP Webhook",
    type: "http-webhook",
    description:
      "Receives an HTTP webhook and executes the workflow asynchronously.",
    tags: ["Data", "Parameter", "HTTP"],
    icon: "webhook",
    documentation:
      "This node receives an HTTP webhook via an endpoint. The workflow executes asynchronously and returns an execution ID immediately.",
    inlinable: true,
    trigger: true,
    inputs: [
      {
        name: "endpointId",
        type: "string",
        description: "The HTTP endpoint",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "method",
        type: "string",
        description: "The HTTP method (GET, POST, PUT, DELETE, etc.)",
      },
      {
        name: "url",
        type: "string",
        description: "The full URL of the request",
      },
      {
        name: "path",
        type: "string",
        description: "The path portion of the URL",
      },
      {
        name: "headers",
        type: "json",
        description: "The HTTP headers as a JSON object",
      },
      {
        name: "queryParams",
        type: "json",
        description: "The query parameters as a JSON object",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.httpRequest) {
        return this.createErrorResult(
          "HTTP request information is required but not provided"
        );
      }

      const { method, url, path, headers, queryParams } = context.httpRequest;

      return this.createSuccessResult({
        method,
        url,
        path,
        headers: headers || {},
        queryParams: queryParams || {},
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
