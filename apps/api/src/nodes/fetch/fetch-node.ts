import { NodeExecution, NodeType } from "@dafthunk/types";

import {
  BlobParameter,
  ExecutableNode,
  NodeContext,
  ParameterValue,
} from "@dafthunk/runtime";

export class FetchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "fetch",
    name: "Fetch",
    type: "fetch",
    description: "Fetch data from a URL using the Fetch API.",
    tags: ["Network", "HTTP", "Fetch"],
    icon: "globe",
    documentation:
      "This node fetches data from a URL using the Fetch API with support for custom methods, headers, query parameters, and timeouts.",
    asTool: true,
    usage: 10,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "The URL to fetch.",
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
        type: "any",
        description:
          "Request body (for POST, PUT, etc.) - can be string, JSON object, or BlobParameter (optional)",
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
        type: "blob",
        description: "Response body with MIME type from Content-Type header",
      },
      {
        name: "error",
        type: "string",
        description: "Error message if the fetch fails",
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

    // Process request body
    const processedBody = this.processRequestBody(body);

    const fetchOptions: RequestInit = {
      method,
      headers: headers && typeof headers === "object" ? headers : undefined,
      body: ["GET", "HEAD"].includes(method.toUpperCase())
        ? undefined
        : processedBody,
    };
    let controller: AbortController | undefined;
    if (timeout && typeof timeout === "number") {
      controller = new AbortController();
      fetchOptions.signal = controller.signal;
      setTimeout(() => controller?.abort(), timeout);
    }
    try {
      const response = await fetch(finalUrl, fetchOptions);

      // Get response body as bytes
      const responseBytes = new Uint8Array(await response.arrayBuffer());

      // Extract Content-Type from response headers
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Create BlobParameter for response body
      const responseBody: BlobParameter = {
        data: responseBytes,
        mimeType: contentType,
      };

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

  private processRequestBody(body: ParameterValue): BodyInit | undefined {
    if (body === null || body === undefined) {
      return undefined;
    }

    // Handle BlobParameter (blob, image, document, etc.)
    if (this.isBlobParameter(body)) {
      return body.data;
    }

    // Handle plain objects and arrays (JSON)
    if (typeof body === "object") {
      return JSON.stringify(body);
    }

    // Handle primitives (string, number, boolean)
    if (typeof body === "string") {
      return body;
    }

    if (typeof body === "number" || typeof body === "boolean") {
      return String(body);
    }

    return undefined;
  }

  private isBlobParameter(value: any): value is BlobParameter {
    return (
      value &&
      typeof value === "object" &&
      "data" in value &&
      "mimeType" in value &&
      value.data instanceof Uint8Array
    );
  }
}
