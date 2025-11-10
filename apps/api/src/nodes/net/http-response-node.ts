import { NodeExecution, NodeType } from "@dafthunk/types";

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
    icon: "arrow-left",
    compatibility: ["http_request"], // Only compatible with sync HTTP workflows
    documentation:
      "This node defines the HTTP response to be returned when using a synchronous HTTP Request trigger. " +
      "It allows you to set the status code and body content that will be sent back to the HTTP client. " +
      "The body can be any type (string, json, blob, image, etc.) and the appropriate MIME type will be set automatically.",
    inputs: [
      {
        name: "statusCode",
        type: "number",
        description: "HTTP status code (e.g., 200, 404, 500)",
        value: 200,
      },
      {
        name: "body",
        type: "any",
        description: "Response body content (any type)",
      },
      {
        name: "contentType",
        type: "string",
        description:
          "Override Content-Type header (optional, auto-detected if not provided)",
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
        type: "any",
        description: "Response body",
      },
      {
        name: "contentType",
        type: "string",
        description: "Content-Type header value",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const {
      statusCode = 200,
      body = "",
      contentType: userContentType,
    } = context.inputs;

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

    // Determine content type and format body based on input type
    const { contentType: detectedContentType, formattedBody } =
      this.processBody(body);

    // Use user-provided content type if available, otherwise use detected
    const finalContentType =
      userContentType && typeof userContentType === "string"
        ? userContentType
        : detectedContentType;

    return this.createSuccessResult({
      statusCode,
      body: formattedBody,
      contentType: finalContentType,
    });
  }

  private processBody(body: ParameterValue): {
    contentType: string;
    formattedBody: any;
  } {
    // Handle null/undefined
    if (body === null || body === undefined) {
      return { contentType: "text/plain", formattedBody: "" };
    }

    // Handle blob types (blob, image, document, audio, buffergeometry, gltf)
    if (this.isBlobParameter(body)) {
      return {
        contentType: body.mimeType || "application/octet-stream",
        formattedBody: body.data,
      };
    }

    // Handle GeoJSON
    if (this.isGeoJSON(body)) {
      return {
        contentType: "application/geo+json",
        formattedBody: JSON.stringify(body),
      };
    }

    // Handle plain objects and arrays (JSON)
    if (typeof body === "object") {
      return {
        contentType: "application/json",
        formattedBody: JSON.stringify(body),
      };
    }

    // Handle primitives
    if (typeof body === "string") {
      return { contentType: "text/plain; charset=utf-8", formattedBody: body };
    }

    if (typeof body === "number" || typeof body === "boolean") {
      return {
        contentType: "text/plain",
        formattedBody: String(body),
      };
    }

    // Fallback
    return {
      contentType: "text/plain",
      formattedBody: String(body),
    };
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
}
