import {
  type BlobParameter,
  ExecutableNode,
  isBlobParameter,
  type NodeContext,
  toUint8Array,
} from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class HttpRequestNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "http-request",
    name: "HTTP Request",
    type: "http-request",
    description:
      "Receives an HTTP request and returns the response synchronously.",
    tags: ["Data", "Parameter", "HTTP"],
    icon: "log-in",
    documentation:
      "This node receives an HTTP request at /http/{workflowId}. The workflow executes synchronously and the call returns the execution result, including each node's output.",
    inlinable: true,
    trigger: true,
    inputs: [],
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
      {
        name: "body",
        type: "blob",
        description: "The raw request body with MIME type",
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

      const { method, url, path, headers, queryParams, body } =
        context.httpRequest;

      // Normalize body - Cloudflare Workflows serializes Uint8Array to object with numeric keys
      let normalizedBody: BlobParameter | undefined;
      if (body && isBlobParameter(body)) {
        normalizedBody = {
          data: toUint8Array(body.data),
          mimeType: body.mimeType,
        };
      }

      return this.createSuccessResult({
        method,
        url,
        path,
        headers: headers || {},
        queryParams: queryParams || {},
        body: normalizedBody,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
