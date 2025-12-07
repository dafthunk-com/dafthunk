import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import {
  BlobParameter,
  ExecutableNode,
  NodeContext,
  ParameterValue,
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
    outputs: [],
  };

  constructor(node: Node) {
    super(node);
  }

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
    const encoder = new TextEncoder();

    // Handle null/undefined
    if (body === null || body === undefined) {
      return {
        contentType: "text/plain",
        formattedBody: { data: new Uint8Array(0), mimeType: "text/plain" },
      };
    }

    // Handle blob types (blob, image, document, audio, buffergeometry, gltf)
    if (this.isBlobParameter(body)) {
      const data = this.toUint8Array(body.data);
      const mimeType = body.mimeType || "application/octet-stream";
      return {
        contentType: mimeType,
        formattedBody: { data, mimeType },
      };
    }

    // Handle GeoJSON
    if (this.isGeoJSON(body)) {
      const mimeType = "application/geo+json";
      return {
        contentType: mimeType,
        formattedBody: {
          data: encoder.encode(JSON.stringify(body)),
          mimeType,
        },
      };
    }

    // Handle plain objects and arrays (JSON)
    if (typeof body === "object") {
      const mimeType = "application/json";
      return {
        contentType: mimeType,
        formattedBody: {
          data: encoder.encode(JSON.stringify(body)),
          mimeType,
        },
      };
    }

    // Handle primitives
    if (typeof body === "string") {
      const mimeType = "text/plain; charset=utf-8";
      return {
        contentType: mimeType,
        formattedBody: { data: encoder.encode(body), mimeType },
      };
    }

    if (typeof body === "number" || typeof body === "boolean") {
      const mimeType = "text/plain";
      return {
        contentType: mimeType,
        formattedBody: { data: encoder.encode(String(body)), mimeType },
      };
    }

    // Fallback
    const mimeType = "text/plain";
    return {
      contentType: mimeType,
      formattedBody: { data: encoder.encode(String(body)), mimeType },
    };
  }

  private isBlobParameter(value: any): value is BlobParameter {
    if (!value || typeof value !== "object") return false;
    if (!("data" in value) || !("mimeType" in value)) return false;

    // Handle native Uint8Array
    if (value.data instanceof Uint8Array) return true;

    // Handle serialized Uint8Array (plain object with numeric keys from JSON)
    if (
      value.data &&
      typeof value.data === "object" &&
      !Array.isArray(value.data)
    ) {
      const keys = Object.keys(value.data);
      return keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
    }

    return false;
  }

  private toUint8Array(data: Uint8Array | Record<string, number>): Uint8Array {
    if (data instanceof Uint8Array) return data;
    // Convert serialized Uint8Array back to native
    const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
    return new Uint8Array(keys.map((k) => data[k]));
  }

  private isGeoJSON(value: any): boolean {
    return (
      value &&
      typeof value === "object" &&
      "type" in value &&
      (value.type === "Feature" ||
        value.type === "FeatureCollection" ||
        value.type === "Point" ||
        value.type === "LineString" ||
        value.type === "Polygon" ||
        value.type === "MultiPoint" ||
        value.type === "MultiLineString" ||
        value.type === "MultiPolygon" ||
        value.type === "GeometryCollection")
    );
  }

  private isTextMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml" ||
      mimeType.endsWith("+json") ||
      mimeType.endsWith("+xml")
    );
  }
}
