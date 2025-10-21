import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class HttpRequestNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "http-request",
    name: "HTTP Request",
    type: "http-request",
    description: "Make a customizable HTTP request to a third-party service.",
    tags: ["Network", "HTTP", "Request"],
    icon: "globe",
    documentation:
      "This node makes a customizable HTTP request to a third-party service.",
    asTool: true,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The endpoint URL to call.",
        required: true,
      },
      {
        name: "method",
        type: "string",
        description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
        value: "GET",
      },
      {
        name: "headers",
        type: "json",
        description: "Request headers as a JSON object (optional)",
      },
      {
        name: "body",
        type: "string",
        description: "Request body (for POST, PUT, etc.) (optional)",
      },
      {
        name: "query",
        type: "json",
        description: "Query parameters as a JSON object (optional)",
      },
      {
        name: "timeout",
        type: "number",
        description: "Timeout in milliseconds (optional)",
      },
    ],
    outputs: [
      {
        name: "status",
        type: "number",
        description: "HTTP status code",
      },
      {
        name: "statusText",
        type: "string",
        description: "HTTP status text",
      },
      {
        name: "headers",
        type: "json",
        description: "Response headers as a JSON object",
      },
      {
        name: "body",
        type: "string",
        description: "Response body as text",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if the request fails",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const {
      url,
      method = "GET",
      headers,
      body,
      query,
      timeout,
    } = context.inputs;
    if (!url) {
      return this.createErrorResult("'url' is a required input.");
    }
    let finalUrl = url;
    if (query && typeof query === "object") {
      const params = new URLSearchParams(query).toString();
      finalUrl += (url.includes("?") ? "&" : "?") + params;
    }
    const fetchOptions: RequestInit = {
      method,
      headers: headers && typeof headers === "object" ? headers : undefined,
      body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : body,
    };
    let controller: AbortController | undefined;
    if (timeout && typeof timeout === "number") {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      setTimeout(() => controller?.abort(), timeout);
    }
    try {
      const response = await fetch(finalUrl, fetchOptions);
      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      return this.createSuccessResult({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
