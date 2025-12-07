import type { NodeExecution, NodeType } from "@dafthunk/types";

import {
  BlobParameter,
  ExecutableNode,
  isBlobParameter,
  NodeContext,
  ParameterValue,
  toUint8Array,
} from "../types";

export class HttpResponseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "http-response",
    name: "HTTP Response",
    type: "http-response",
    description:
      "Define the HTTP response for synchronous HTTP Request workflows.",
    tags: ["Network", "HTTP", "Response"],
    icon: "log-out",
    compatibility: ["http_request"], // Only compatible with sync HTTP workflows
    documentation:
      "This node defines the HTTP response to be returned when using a synchronous HTTP Request trigger. " +
      "It allows you to set the status code, headers, and body content that will be sent back to the HTTP client. " +
      "The body can be any type (string, json, blob, image, etc.) and the Content-Type will be auto-detected if not provided in headers.",
    inputs: [
      {
        name: "statusCode",
        type: "number",
        description: "HTTP status code (e.g., 200, 404, 500)",
        value: 200,
      },
      {
        name: "headers",
        type: "json",
        description:
          "HTTP response headers as a JSON object (Content-Type auto-detected if not provided)",
      },
      {
        name: "body",
        type: "any",
        description: "Response body content (any type)",
      },
    ],
    outputs: [
      {
        name: "statusCode",
        type: "number",
        description: "HTTP status code",
        hidden: true,
      },
      {
        name: "headers",
        type: "json",
        description: "HTTP response headers",
        hidden: true,
      },
      {
        name: "body",
        type: "blob",
        description: "Response body",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { statusCode = 200, headers = {}, body = "" } = context.inputs;

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

    // Validate headers
    if (typeof headers !== "object" || headers === null) {
      return this.createErrorResult("Headers must be a JSON object");
    }

    // Normalize header keys to lowercase for Content-Type check
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = String(value);
    }

    // Determine content type and format body based on input type
    const { contentType: detectedContentType, formattedBody } =
      this.processBody(body);

    // Only set Content-Type if not already provided in headers
    const finalHeaders: Record<string, string> = { ...normalizedHeaders };
    if (!finalHeaders["content-type"]) {
      finalHeaders["content-type"] = detectedContentType;
    }

    return this.createSuccessResult({
      statusCode,
      headers: finalHeaders,
      body: formattedBody,
    });
  }

  private processBody(body: ParameterValue): {
    contentType: string;
    formattedBody: BlobParameter;
  } {
    // Handle null/undefined
    if (body === null || body === undefined) {
      return this.createBlobResult(new Uint8Array(0), "text/plain");
    }

    // Handle blob types (blob, image, document, audio, buffergeometry, gltf)
    if (isBlobParameter(body)) {
      const mimeType = body.mimeType || "application/octet-stream";
      return this.createBlobResult(toUint8Array(body.data), mimeType);
    }

    // Handle objects and arrays (JSON, including GeoJSON)
    if (typeof body === "object") {
      return this.createTextResult(JSON.stringify(body), "application/json");
    }

    // Handle string
    if (typeof body === "string") {
      return this.createTextResult(body, "text/plain; charset=utf-8");
    }

    // Handle number, boolean, and fallback
    return this.createTextResult(String(body), "text/plain");
  }

  private createBlobResult(
    data: Uint8Array,
    mimeType: string
  ): { contentType: string; formattedBody: BlobParameter } {
    return { contentType: mimeType, formattedBody: { data, mimeType } };
  }

  private createTextResult(
    text: string,
    mimeType: string
  ): { contentType: string; formattedBody: BlobParameter } {
    return this.createBlobResult(new TextEncoder().encode(text), mimeType);
  }
}
