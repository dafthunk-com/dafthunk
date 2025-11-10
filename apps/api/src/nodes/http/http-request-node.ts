import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class HttpRequestNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "http-request",
    name: "HTTP Request",
    type: "http-request",
    description:
      "Extracts information from the HTTP request sent by the trigger.",
    tags: ["Data", "Parameter", "HTTP"],
    icon: "log-in",
    documentation:
      "This node extracts HTTP request information from the context, including method, URL, headers, and query parameters.",
    inlinable: true,
    asTool: true,
    compatibility: ["http_webhook", "http_request"],
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
        description:
          "The raw request body with MIME type (JSON, images, PDFs, etc.)",
      },
      {
        name: "formData",
        type: "json",
        description: "The form data as a JSON object (for form submissions)",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.httpRequest) {
        return this.createErrorResult(
          "HTTP request information is required but not provided"
        );
      }

      const { method, url, path, headers, queryParams, body, formData } =
        context.httpRequest;

      return this.createSuccessResult({
        method,
        url,
        path,
        headers: headers || {},
        queryParams: queryParams || {},
        body: body || undefined,
        formData: formData || {},
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
